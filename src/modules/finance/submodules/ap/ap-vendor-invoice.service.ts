import { Buffer } from 'node:buffer'
import { and, count, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, ConflictError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import {
  apBills,
  apVendorInvoiceItems,
  apVendorInvoicePayments,
  purchaseOrders,
  vendors,
} from '../../finance.schema'

Decimal.set({ rounding: Decimal.ROUND_HALF_UP })

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

const EXPENSE_CATEGORIES = new Set([
  'Equipment',
  'Labor',
  'Service',
  'Software',
  'Office',
  'Other',
])
const WHT_TYPES = new Set(['service', 'rent', 'interest', 'other'])
const PAYMENT_METHODS = new Set(['transfer', 'cash', 'cheque', 'credit_card'])

function roundMoney(n: Decimal | number | string): number {
  return new Decimal(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
}

function todayBangkok(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${d}`
}

function ymdBangkok(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function parseYmdToUtcNoon(s: string): Date {
  const parts = s.split('-').map(Number)
  const y = parts[0] ?? 0
  const mo = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
}

async function nextApReference(tx: DbTransaction): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(881002)`)
  const [row] = await tx
    .select({
      maxSeq: sql<number>`coalesce(max(
        case when ${apBills.referenceNumber} ~ '^AP-[0-9]{4}$'
          then (regexp_replace(${apBills.referenceNumber}, '^AP-', ''))::int
          else 0
        end
      ), 0)`,
    })
    .from(apBills)
  const next = (row?.maxSeq ?? 0) + 1
  return `AP-${String(next).padStart(4, '0')}`
}

export type ApVendorInvoiceListItem = {
  id: string
  referenceNumber: string
  poId?: string
  vendorInvoiceNumber?: string
  vendorId: string
  vendorName: string
  vendorCode: string
  issueDate: string
  dueDate: string
  receivedDate: string
  subtotal: number
  vatAmount: number
  whtAmount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  expenseCategory?: string
  createdAt: string
  updatedAt: string
}

export type ApVendorInvoiceDetail = ApVendorInvoiceListItem & {
  attachmentUrl?: string
  notes?: string
  rejectReason?: string
  approvedBy?: string
  approvedAt?: string
  items: {
    id: string
    description: string
    quantity: number
    unitPrice: number
    amount: number
    whtType?: string
    whtRate?: number
  }[]
  payments: {
    id: string
    paymentDate: string
    amount: number
    paymentMethod: string
    reference?: string
    notes?: string
    createdAt: string
  }[]
}

function mapBillToList(
  b: typeof apBills.$inferSelect,
  vendorName: string,
  vendorCode: string
): ApVendorInvoiceListItem {
  const total = roundMoney(b.totalAmount)
  const paid = roundMoney(b.paidAmount)
  return {
    id: b.id,
    referenceNumber: b.referenceNumber,
    ...(b.poId != null && b.poId !== '' ? { poId: b.poId } : {}),
    ...(b.vendorInvoiceNumber != null && b.vendorInvoiceNumber !== ''
      ? { vendorInvoiceNumber: b.vendorInvoiceNumber }
      : {}),
    vendorId: b.vendorId,
    vendorName,
    vendorCode,
    issueDate: b.issueDate.toISOString().slice(0, 10),
    dueDate: b.dueDate.toISOString().slice(0, 10),
    receivedDate: b.receivedDate.toISOString().slice(0, 10),
    subtotal: roundMoney(b.subtotal),
    vatAmount: roundMoney(b.vatAmount),
    whtAmount: roundMoney(b.whtAmount),
    totalAmount: total,
    paidAmount: paid,
    remainingAmount: roundMoney(new Decimal(total).minus(paid)),
    status: b.status,
    ...(b.expenseCategory != null && b.expenseCategory !== ''
      ? { expenseCategory: b.expenseCategory }
      : {}),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}

export const ApVendorInvoiceService = {
  async list(query: {
    page?: number
    perPage?: number
    search?: string
    status?: string
    vendorId?: string
  }): Promise<PaginatedResult<ApVendorInvoiceListItem>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = []
    if (query.vendorId) conditions.push(eq(apBills.vendorId, query.vendorId))
    if (query.status) conditions.push(eq(apBills.status, query.status))
    if (query.search) {
      const term = `%${query.search}%`
      conditions.push(
        or(
          ilike(apBills.referenceNumber, term),
          ilike(apBills.vendorInvoiceNumber, term),
          ilike(vendors.name, term)
        )!
      )
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countRow] = await db
      .select({ c: count() })
      .from(apBills)
      .innerJoin(vendors, eq(apBills.vendorId, vendors.id))
      .where(whereClause)

    const total = Number(countRow?.c ?? 0)

    const rows = await db
      .select({
        b: apBills,
        vendorName: vendors.name,
        vendorCode: vendors.code,
      })
      .from(apBills)
      .innerJoin(vendors, eq(apBills.vendorId, vendors.id))
      .where(whereClause)
      .orderBy(desc(apBills.createdAt))
      .limit(perPage)
      .offset(offset)

    return {
      data: rows.map((r) => mapBillToList(r.b, r.vendorName, r.vendorCode)),
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  },

  async getById(id: string): Promise<ApVendorInvoiceDetail> {
    const row = await db
      .select({
        b: apBills,
        vendorName: vendors.name,
        vendorCode: vendors.code,
      })
      .from(apBills)
      .innerJoin(vendors, eq(apBills.vendorId, vendors.id))
      .where(eq(apBills.id, id))
      .limit(1)

    const first = row[0]
    if (!first) throw new AppError('AP_NOT_FOUND', 'AP not found', 404)

    const items = await db
      .select()
      .from(apVendorInvoiceItems)
      .where(eq(apVendorInvoiceItems.apBillId, id))
      .orderBy(apVendorInvoiceItems.id)

    const payments = await db
      .select()
      .from(apVendorInvoicePayments)
      .where(eq(apVendorInvoicePayments.apBillId, id))
      .orderBy(desc(apVendorInvoicePayments.createdAt))

    const base = mapBillToList(first.b, first.vendorName, first.vendorCode)
    return {
      ...base,
      ...(first.b.attachmentUrl != null && first.b.attachmentUrl !== ''
        ? { attachmentUrl: first.b.attachmentUrl }
        : {}),
      ...(first.b.notes != null && first.b.notes !== '' ? { notes: first.b.notes } : {}),
      ...(first.b.rejectReason != null && first.b.rejectReason !== ''
        ? { rejectReason: first.b.rejectReason }
        : {}),
      ...(first.b.approvedBy != null ? { approvedBy: first.b.approvedBy } : {}),
      ...(first.b.approvedAt != null
        ? { approvedAt: first.b.approvedAt.toISOString() }
        : {}),
      items: items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: roundMoney(it.unitPrice),
        amount: roundMoney(it.amount),
        ...(it.whtType != null && it.whtType !== '' ? { whtType: it.whtType } : {}),
        ...(it.whtRate != null ? { whtRate: roundMoney(it.whtRate) } : {}),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        paymentDate: p.paymentDate,
        amount: roundMoney(p.amount),
        paymentMethod: p.paymentMethod,
        ...(p.reference != null && p.reference !== '' ? { reference: p.reference } : {}),
        ...(p.notes != null && p.notes !== '' ? { notes: p.notes } : {}),
        createdAt: p.createdAt.toISOString(),
      })),
    }
  },

  async create(body: {
    vendorId: string
    vendorInvoiceNumber?: string
    issueDate: string
    dueDate: string
    receivedDate: string
    subtotal: number
    vatAmount: number
    whtAmount: number
    totalAmount: number
    expenseCategory?: string
    items: {
      description: string
      quantity: number
      unitPrice: number
      amount: number
      whtType?: string
      whtRate?: number
    }[]
    attachmentUrl?: string
    notes?: string
    poId?: string
  }) {
    const vendor = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, body.vendorId), isNull(vendors.deletedAt)),
    })
    if (!vendor) throw new AppError('VENDOR_NOT_FOUND', 'Vendor not found', 404)
    if (!vendor.isActive) {
      throw new AppError('VENDOR_INACTIVE', 'Vendor is inactive', 400)
    }

    const today = todayBangkok()
    if (body.issueDate > today || body.receivedDate > today) {
      throw new AppError('VALIDATION_ERROR', 'Dates cannot be in the future', 400)
    }
    if (body.dueDate < body.issueDate) {
      throw new AppError('INVALID_DATE_RANGE', 'dueDate must be >= issueDate', 400)
    }

    const subtotal = roundMoney(body.subtotal)
    const vat = roundMoney(body.vatAmount)
    const wht = roundMoney(body.whtAmount)
    const total = roundMoney(body.totalAmount)
    const expected = roundMoney(new Decimal(subtotal).plus(vat).minus(wht))
    if (expected !== total) {
      throw new ValidationError({ totalAmount: ['ยอดรวมไม่ตรงกับ subtotal + VAT - WHT'] })
    }

    if (!body.items?.length) {
      throw new ValidationError({ items: ['ต้องมีอย่างน้อย 1 รายการ'] })
    }

    for (const it of body.items) {
      if (!it.description?.trim()) {
        throw new ValidationError({ items: ['รายการต้องมีคำอธิบาย'] })
      }
      const qty = roundMoney(it.quantity)
      const up = roundMoney(it.unitPrice)
      const amt = roundMoney(it.amount)
      if (qty <= 0 || up <= 0) {
        throw new ValidationError({ items: ['quantity and unitPrice must be positive'] })
      }
      const expAmt = roundMoney(new Decimal(qty).mul(up))
      if (expAmt !== amt) {
        throw new ValidationError({ items: ['amount must equal quantity × unitPrice'] })
      }
      if (it.whtType !== undefined && !WHT_TYPES.has(it.whtType)) {
        throw new ValidationError({ items: ['whtType ไม่ถูกต้อง'] })
      }
      if (it.whtRate !== undefined && (it.whtRate < 0 || it.whtRate > 100)) {
        throw new ValidationError({ items: ['whtRate ต้องอยู่0–100'] })
      }
    }

    if (body.expenseCategory !== undefined && !EXPENSE_CATEGORIES.has(body.expenseCategory)) {
      throw new ValidationError({ expenseCategory: ['หมวดค่าใช้จ่ายไม่ถูกต้อง'] })
    }

    if (body.attachmentUrl !== undefined && body.attachmentUrl !== '') {
      try {
        // eslint-disable-next-line no-new
        new URL(body.attachmentUrl)
      } catch {
        throw new ValidationError({ attachmentUrl: ['URL ไม่ถูกต้อง'] })
      }
    }

    const newBillId = await db.transaction(async (tx) => {
      let resolvedPoId: string | null = null
      if (body.poId != null && body.poId !== '') {
        const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, body.poId)).limit(1)
        if (!po) throw new AppError('PO_NOT_FOUND', 'Purchase order not found', 404)
        if (po.vendorId !== body.vendorId) {
          throw new AppError('AP_PO_VENDOR_MISMATCH', 'Vendor does not match purchase order', 400)
        }
        if (!['approved', 'partially_received', 'received'].includes(po.status)) {
          throw new AppError('AP_PO_NOT_BILLABLE', 'AP can only be linked to an approved purchase order', 400)
        }
        const [sumRow] = await tx
          .select({
            s: sql<string>`coalesce(sum(${apBills.totalAmount}::numeric), 0)`,
          })
          .from(apBills)
          .where(and(eq(apBills.poId, body.poId), ne(apBills.status, 'rejected')))
        const billed = new Decimal(sumRow?.s ?? '0')
        if (billed.plus(total).gt(new Decimal(po.totalAmount))) {
          throw new AppError('AP_PO_OVER_BILLED', 'Total AP for this PO would exceed PO amount', 400)
        }
        resolvedPoId = body.poId
      }

      if (body.vendorInvoiceNumber?.trim()) {
        const vin = body.vendorInvoiceNumber.trim()
        const exists = await tx.query.apBills.findFirst({
          where: eq(apBills.vendorInvoiceNumber, vin),
        })
        if (exists) {
          throw new ConflictError('AP_INVOICE_NUMBER_DUPLICATE', 'Duplicate vendor invoice number', {
            vendorInvoiceNumber: 'Duplicate',
          })
        }
      }

      const referenceNumber = await nextApReference(tx)
      const issueDate = parseYmdToUtcNoon(body.issueDate)
      const dueDate = parseYmdToUtcNoon(body.dueDate)
      const receivedDate = parseYmdToUtcNoon(body.receivedDate)

      const [bill] = await tx
        .insert(apBills)
        .values({
          referenceNumber,
          vendorInvoiceNumber: body.vendorInvoiceNumber?.trim() || null,
          vendorId: body.vendorId,
          poId: resolvedPoId,
          issueDate,
          dueDate,
          receivedDate,
          subtotal: String(subtotal),
          vatAmount: String(vat),
          whtAmount: String(wht),
          totalAmount: String(total),
          paidAmount: '0',
          expenseCategory: body.expenseCategory ?? null,
          attachmentUrl: body.attachmentUrl?.trim() || null,
          notes: body.notes?.trim() || null,
          status: 'pending',
        })
        .returning({ id: apBills.id })

      if (!bill) throw new ValidationError({ ap: ['สร้าง AP ไม่สำเร็จ'] })

      await tx.insert(apVendorInvoiceItems).values(
        body.items.map((it) => ({
          apBillId: bill.id,
          description: it.description.trim(),
          quantity: String(roundMoney(it.quantity)),
          unitPrice: String(roundMoney(it.unitPrice)),
          amount: String(roundMoney(it.amount)),
          whtType: it.whtType ?? null,
          whtRate:
            it.whtRate !== undefined ? String(roundMoney(it.whtRate)) : null,
        }))
      )

      return bill.id
    })
    return this.getById(newBillId)
  },

  async patchStatus(id: string, body: { action: 'approve' | 'reject'; reason?: string }, userId: string) {
    const row = await db.query.apBills.findFirst({ where: eq(apBills.id, id) })
    if (!row) throw new AppError('AP_NOT_FOUND', 'AP not found', 404)

    const st = row.status
    if (body.action === 'approve') {
      if (st !== 'pending') {
        throw new AppError('INVALID_TRANSITION', 'Cannot approve from this status', 400)
      }
      await db
        .update(apBills)
        .set({
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(apBills.id, id))
      return this.getById(id)
    }

    if (body.action === 'reject') {
      if (st !== 'pending') {
        throw new AppError('INVALID_TRANSITION', 'Cannot reject from this status', 400)
      }
      const reason = body.reason?.trim()
      if (!reason) {
        throw new AppError('REJECT_REASON_REQUIRED', 'Reason required', 400)
      }
      await db
        .update(apBills)
        .set({
          status: 'rejected',
          rejectReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(apBills.id, id))
      return this.getById(id)
    }

    throw new ValidationError({ action: ['ไม่รองรับ actionนี้'] })
  },

  async addPayment(
    id: string,
    body: {
      paymentDate: string
      amount: number
      paymentMethod: string
      reference?: string
      notes?: string
    }
  ) {
    const row = await db.query.apBills.findFirst({ where: eq(apBills.id, id) })
    if (!row) throw new AppError('AP_NOT_FOUND', 'AP not found', 404)

    if (row.status !== 'approved' && row.status !== 'overdue') {
      throw new AppError('AP_NOT_APPROVABLE', 'AP must be approved or overdue', 400)
    }

    const today = todayBangkok()
    if (body.paymentDate > today) {
      throw new AppError('INVALID_PAYMENT_DATE', 'paymentDate cannot be in the future', 400)
    }

    if (!PAYMENT_METHODS.has(body.paymentMethod)) {
      throw new ValidationError({ paymentMethod: ['วิธีชำระไม่ถูกต้อง'] })
    }

    const payAmt = roundMoney(body.amount)
    if (payAmt <= 0) {
      throw new ValidationError({ amount: ['amount must be greater than 0'] })
    }

    const totalAmount = roundMoney(row.totalAmount)
    const paidAmount = roundMoney(row.paidAmount)
    const remaining = roundMoney(new Decimal(totalAmount).minus(paidAmount))
    if (payAmt > remaining) {
      throw new AppError('OVERPAYMENT_NOT_ALLOWED', 'Amount exceeds remaining', 400)
    }

    const nextPaid = roundMoney(new Decimal(paidAmount).plus(payAmt))
    const nextStatus = nextPaid >= totalAmount ? 'paid' : row.status

    await db.transaction(async (tx) => {
      await tx.insert(apVendorInvoicePayments).values({
        apBillId: id,
        paymentDate: body.paymentDate,
        amount: String(payAmt),
        paymentMethod: body.paymentMethod,
        reference: body.reference?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      await tx
        .update(apBills)
        .set({
          paidAmount: String(nextPaid),
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(apBills.id, id))
    })

    return this.getById(id)
  },

  /** Daily job: approved + past due → overdue */
  async markOverdueForBangkokToday() {
    const today = todayBangkok()
    const candidates = await db
      .select({ id: apBills.id, dueDate: apBills.dueDate })
      .from(apBills)
      .where(eq(apBills.status, 'approved'))

    const ids = candidates
      .filter((r) => ymdBangkok(r.dueDate) < today)
      .map((r) => r.id)

    if (ids.length === 0) return 0

    await db
      .update(apBills)
      .set({ status: 'overdue', updatedAt: new Date() })
      .where(inArray(apBills.id, ids))

    return ids.length
  },

  async buildPdfBuffer(id: string): Promise<Buffer> {
    const detail = await ApVendorInvoiceService.getById(id)
    const { buildAsciiPdf } = await import('../tax/tax-pdf')
    const lines = [
      'VENDOR INVOICE / AP (ASCII preview PDF)',
      `Ref: ${detail.referenceNumber}`,
      `Vendor: ${detail.vendorName}`,
      `Issue / due: ${detail.issueDate} / ${detail.dueDate}`,
      `Total: ${detail.totalAmount}  Paid: ${detail.paidAmount}  Remaining: ${detail.remainingAmount}`,
      `Status: ${detail.status}`,
      '---',
      ...detail.items.map(
        (it) => `${it.description} | ${it.quantity} x ${it.unitPrice} => ${it.amount}`
      ),
    ]
    return buildAsciiPdf(lines)
  },
}
