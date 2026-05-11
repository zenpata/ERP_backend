import { Buffer } from 'node:buffer'
import { and, count, desc, eq, gte, ilike, inArray, isNull, lte, notInArray, or } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { customers, invoiceItems, invoicePayments, invoices, salesOrders, soItems } from '../../finance.schema'

// DB status → เก็บใน DB
type DbInvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue'

export type InvoiceItemApi = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
  vatRate: number
  vatAmount: number
  whtRate: number
  whtAmount: number
}

export type InvoiceApi = {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  issueDate: string
  dueDate: string
  items: InvoiceItemApi[]
  subtotal: number
  vatAmount: number
  whtAmount: number
  withholdingAmount: number
  totalAmount: number
  grandTotal: number
  paidAmount: number
  balanceDue: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  notes?: string
  createdAt: string
  updatedAt: string
}

export type InvoicePaymentApi = {
  id: string
  invoiceId: string
  paymentDate: string
  amount: number
  paymentMethod: string
  bankAccountId?: string
  referenceNo?: string
  notes?: string
  createdAt: string
}

export type RecordPaymentResult = {
  invoiceId: string
  paidAmount: number
  balanceDue: number
  invoiceStatus: InvoiceApi['status']
}

function dbStatusToApi(
  s: string,
  due: Date,
  paid: string,
  total: string
): InvoiceApi['status'] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)

  if (s === 'cancelled') return 'cancelled'
  if (s === 'paid') return 'paid'
  if (s === 'draft') return 'draft'

  const paidD = new Decimal(paid)
  const totalD = new Decimal(total)
  if (paidD.gt(0) && paidD.lt(totalD)) {
    if (dueDay < today) return 'overdue'
    return 'sent'
  }
  if ((s === 'issued' || s === 'partially_paid' || s === 'overdue') && dueDay < today && !paidD.eq(totalD)) {
    return 'overdue'
  }
  if (s === 'issued' || s === 'partially_paid') return 'sent'
  if (s === 'overdue') return 'overdue'
  return 'sent'
}

function apiStatusToDbFilter(apiStatus: string): DbInvoiceStatus[] | undefined {
  switch (apiStatus) {
    case 'draft':
      return ['draft']
    case 'sent':
      return ['issued', 'partially_paid']
    case 'paid':
      return ['paid']
    case 'cancelled':
      return ['cancelled']
    default:
      return undefined
  }
}

function round2(n: Decimal): string {
  return n.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()
}

async function nextInvoiceNumber(): Promise<string> {
  const [r] = await db.select({ c: count() }).from(invoices)
  const n = Number(r?.c ?? 0) + 1
  return `INV-${String(n).padStart(5, '0')}`
}

function rowToItem(
  line: typeof invoiceItems.$inferSelect,
  vatRatePct: number,
  lineSubEx: Decimal,
  lineVat: Decimal,
  lineWht: Decimal
): InvoiceItemApi {
  const sub = lineSubEx.toNumber()
  const vat = lineVat.toNumber()
  return {
    id: line.id,
    description: line.description,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    amount: sub + vat,
    vatRate: vatRatePct,
    vatAmount: vat,
    whtRate: sub > 0 ? Number(lineWht.div(lineSubEx).mul(100).toFixed(2)) : 0,
    whtAmount: lineWht.toNumber(),
  }
}

async function loadItemsForInvoice(
  invoiceId: string,
  invoiceVatTotal: string,
  invoiceSubtotal: string
): Promise<InvoiceItemApi[]> {
  const lines = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
  const sub = new Decimal(invoiceSubtotal)
  const vat = new Decimal(invoiceVatTotal)
  if (lines.length === 0) return []

  const out: InvoiceItemApi[] = []
  let accVat = new Decimal(0)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const lineSub = new Decimal(line.quantity).mul(line.unitPrice)
    const wht = new Decimal(line.whtAmount ?? '0')
    const isLast = i === lines.length - 1
    const lineVat = sub.gt(0)
      ? isLast
        ? vat.minus(accVat)
        : vat.mul(lineSub.div(sub)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      : isLast
        ? vat.minus(accVat)
        : new Decimal(0)
    const rate = lineSub.gt(0)
      ? lineVat.div(lineSub).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
      : 0
    out.push(rowToItem(line, rate, lineSub, lineVat, wht))
    accVat = accVat.plus(lineVat)
  }
  return out
}

function toApiSummary(inv: typeof invoices.$inferSelect, customerName: string): InvoiceApi {
  const status = dbStatusToApi(inv.status, inv.dueDate, inv.paidAmount, inv.total)
  const totalNum = Number(inv.total)
  const paidNum = Number(inv.paidAmount)
  const whtNum = Number(inv.whtAmount)
  const balanceDue = Math.max(0, new Decimal(totalNum).minus(paidNum).toNumber())
  const base: InvoiceApi = {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    customerName,
    issueDate: inv.issueDate.toISOString().slice(0, 10),
    dueDate: inv.dueDate.toISOString().slice(0, 10),
    items: [],
    subtotal: Number(inv.subtotal),
    vatAmount: Number(inv.vatAmount),
    whtAmount: whtNum,
    withholdingAmount: whtNum,
    totalAmount: totalNum,
    grandTotal: totalNum,
    paidAmount: paidNum,
    balanceDue,
    status,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  }
  if (inv.note) base.notes = inv.note
  return base
}

function computeDbStatusAfterPayment(inv: typeof invoices.$inferSelect): DbInvoiceStatus {
  if (inv.status === 'cancelled' || inv.status === 'draft') return inv.status as DbInvoiceStatus
  const total = new Decimal(inv.total)
  const paid = new Decimal(inv.paidAmount)
  if (paid.gte(total)) return 'paid'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(inv.dueDate)
  due.setHours(0, 0, 0, 0)
  if (paid.gt(0)) {
    if (due < today) return 'overdue'
    return 'partially_paid'
  }
  if (due < today) return 'overdue'
  return 'issued'
}

function mapPaymentRow(r: typeof invoicePayments.$inferSelect): InvoicePaymentApi {
  const base: InvoicePaymentApi = {
    id: r.id,
    invoiceId: r.invoiceId,
    paymentDate: r.paymentDate.toISOString().slice(0, 10),
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
    createdAt: r.createdAt.toISOString(),
  }
  if (r.bankAccountId != null) base.bankAccountId = r.bankAccountId
  if (r.referenceNo != null) base.referenceNo = r.referenceNo
  if (r.notes != null) base.notes = r.notes
  return base
}

async function toApiFull(inv: typeof invoices.$inferSelect, customerName: string): Promise<InvoiceApi> {
  const items = await loadItemsForInvoice(inv.id, inv.vatAmount, inv.subtotal)
  const base = toApiSummary(inv, customerName)
  return { ...base, items }
}

export const InvoiceService = {
  async list(query: {
    page?: number
    perPage?: number
    search?: string
    status?: string
    customerId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<PaginatedResult<InvoiceApi>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = [isNull(customers.deletedAt)]
    if (query.customerId) conditions.push(eq(invoices.customerId, query.customerId))
    if (query.dateFrom) conditions.push(gte(invoices.issueDate, new Date(query.dateFrom)))
    if (query.dateTo) conditions.push(lte(invoices.issueDate, new Date(query.dateTo + 'T23:59:59')))

    if (query.status === 'overdue') {
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)
      conditions.push(lte(invoices.dueDate, endOfToday))
      conditions.push(notInArray(invoices.status, ['paid', 'cancelled', 'draft']))
    } else {
      const statusFilter = query.status ? apiStatusToDbFilter(query.status) : undefined
      if (statusFilter && statusFilter.length > 0) {
        conditions.push(inArray(invoices.status, statusFilter))
      }
    }

    if (query.search) {
      const term = `%${query.search}%`
      conditions.push(
        or(ilike(invoices.invoiceNumber, term), ilike(customers.name, term), ilike(customers.code, term))!
      )
    }

    const whereClause = and(...conditions)

    const base = db
      .select({ inv: invoices, custName: customers.name })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .$dynamic()

    const [countRow] = await db
      .select({ c: count() })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(whereClause)

    const total = Number(countRow?.c ?? 0)
    const rows = await base.where(whereClause).orderBy(desc(invoices.createdAt)).limit(perPage).offset(offset)

    const data = rows.map((row) => toApiSummary(row.inv, row.custName))

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  },

  async getById(id: string): Promise<InvoiceApi> {
    const row = await db
      .select({ inv: invoices, custName: customers.name })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, id))
      .limit(1)

    const first = row[0]
    if (!first) throw new NotFoundError('invoice')
    return toApiFull(first.inv, first.custName)
  },

  async create(body: {
    customerId: string
    issueDate?: string
    dueDate: string
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      vatRate?: number
      whtRate?: number
    }>
    notes?: string
  }): Promise<InvoiceApi> {
    const [cust] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, body.customerId), isNull(customers.deletedAt)))
      .limit(1)
    if (!cust) throw new ValidationError({ customerId: ['ไม่พบลูกค้า'] })
    if (!cust.isActive) throw new ValidationError({ customerId: ['ลูกค้าถูกปิดการใช้งาน'] })
    if (!body.items?.length) throw new ValidationError({ items: ['ต้องมีอย่างน้อย 1 รายการ'] })

    let subtotal = new Decimal(0)
    let vatTotal = new Decimal(0)
    let whtTotal = new Decimal(0)
    const lineRows: {
      description: string
      quantity: string
      unitPrice: string
      whtType: string | null
      whtAmount: string
      amount: string
    }[] = []

    for (const it of body.items) {
      if (!it.description?.trim()) throw new ValidationError({ items: ['รายการต้องมีคำอธิบาย'] })
      const qty = new Decimal(it.quantity)
      const price = new Decimal(it.unitPrice)
      if (qty.lte(0) || price.lt(0)) throw new ValidationError({ items: ['จำนวนและราคาต้องไม่ติดลบ'] })

      const rate = new Decimal(it.vatRate ?? 7)
      const lineSub = qty.mul(price)
      const lineVat = lineSub.mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      const whtR = new Decimal(it.whtRate ?? 0)
      const lineWht = lineSub.mul(whtR).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

      subtotal = subtotal.plus(lineSub)
      vatTotal = vatTotal.plus(lineVat)
      whtTotal = whtTotal.plus(lineWht)

      lineRows.push({
        description: it.description.trim(),
        quantity: qty.toString(),
        unitPrice: price.toString(),
        whtType: whtR.gt(0) ? 'pct' : null,
        whtAmount: lineWht.toString(),
        amount: lineSub.toString(),
      })
    }

    const total = subtotal.plus(vatTotal).minus(whtTotal)
    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date()
    const dueDate = new Date(body.dueDate)
    const invoiceNumber = await nextInvoiceNumber()

    const [inv] = await db
      .insert(invoices)
      .values({
        invoiceNumber,
        customerId: body.customerId,
        issueDate,
        dueDate,
        subtotal: round2(subtotal),
        vatAmount: round2(vatTotal),
        whtAmount: round2(whtTotal),
        total: round2(total),
        paidAmount: '0',
        status: 'draft',
        note: body.notes ?? null,
      })
      .returning()

    if (!inv) throw new Error('สร้าง invoice ไม่สำเร็จ')

    await db.insert(invoiceItems).values(
      lineRows.map((r) => ({
        invoiceId: inv.id,
        description: r.description,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        whtType: r.whtType,
        whtAmount: r.whtAmount,
        amount: r.amount,
      }))
    )

    return toApiFull(inv, cust.name)
  },

  /**
   * Creates one draft invoice for all remaining quantities on the sales order (B5).
   */
  async createFromSalesOrder(salesOrderId: string): Promise<{
    invoiceId: string
    invoiceNo: string
    salesOrderId: string
    salesOrderStatus: string
  }> {
    const invoiceNumber = await nextInvoiceNumber()

    const result = await db.transaction(async (tx) => {
      const [so] = await tx.select().from(salesOrders).where(eq(salesOrders.id, salesOrderId)).limit(1)
      if (!so) throw new NotFoundError('sales order')
      if (so.status === 'cancelled' || so.status === 'draft') {
        throw new AppError('SO_NOT_INVOICABLE', 'Sales order cannot be converted in this status', 400)
      }
      if (so.status === 'invoiced') {
        throw new AppError('SO_NOTHING_TO_INVOICE', 'Sales order is already fully invoiced', 409)
      }

      const lines = await tx
        .select()
        .from(soItems)
        .where(eq(soItems.soId, salesOrderId))
        .orderBy(soItems.itemNo)

      type LineWork = {
        lineId: string
        description: string
        quantity: number
        unitPrice: number
        vatRate: number
      }
      const work: LineWork[] = []
      for (const line of lines) {
        const qty = new Decimal(line.quantity)
        const invq = new Decimal(line.invoicedQty ?? '0')
        const rem = qty.minus(invq)
        if (rem.lte(0)) continue
        work.push({
          lineId: line.id,
          description: line.description,
          quantity: rem.toNumber(),
          unitPrice: Number(line.unitPrice),
          vatRate: Number(line.vatRate),
        })
      }
      if (!work.length) {
        throw new AppError('SO_NOTHING_TO_INVOICE', 'No remaining quantity to invoice', 409)
      }

      const [cust] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.id, so.customerId), isNull(customers.deletedAt)))
        .limit(1)
      if (!cust) throw new ValidationError({ customerId: ['ไม่พบลูกค้า'] })
      if (!cust.isActive) throw new ValidationError({ customerId: ['ลูกค้าถูกปิดการใช้งาน'] })

      let subtotal = new Decimal(0)
      let vatTotal = new Decimal(0)
      let whtTotal = new Decimal(0)
      const lineRows: {
        description: string
        quantity: string
        unitPrice: string
        whtType: string | null
        whtAmount: string
        amount: string
      }[] = []

      for (const it of work) {
        const qty = new Decimal(it.quantity)
        const price = new Decimal(it.unitPrice)
        const rate = new Decimal(it.vatRate)
        const lineSub = qty.mul(price)
        const lineVat = lineSub.mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        const lineWht = new Decimal(0)

        subtotal = subtotal.plus(lineSub)
        vatTotal = vatTotal.plus(lineVat)
        whtTotal = whtTotal.plus(lineWht)

        lineRows.push({
          description: it.description.trim(),
          quantity: qty.toString(),
          unitPrice: price.toString(),
          whtType: null,
          whtAmount: lineWht.toString(),
          amount: lineSub.toString(),
        })
      }

      const total = subtotal.plus(vatTotal).minus(whtTotal)
      const issueDate = new Date()
      const dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + (cust.creditTermDays ?? 30))

      const [inv] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          customerId: so.customerId,
          salesOrderId,
          issueDate,
          dueDate,
          subtotal: round2(subtotal),
          vatAmount: round2(vatTotal),
          whtAmount: round2(whtTotal),
          total: round2(total),
          paidAmount: '0',
          status: 'issued',
          note: null,
        })
        .returning()

      if (!inv) throw new Error('สร้าง invoice ไม่สำเร็จ')

      await tx.insert(invoiceItems).values(
        lineRows.map((r) => ({
          invoiceId: inv.id,
          description: r.description,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          whtType: r.whtType,
          whtAmount: r.whtAmount,
          amount: r.amount,
        }))
      )

      for (const w of work) {
        const [line] = await tx.select().from(soItems).where(eq(soItems.id, w.lineId)).limit(1)
        if (!line) continue
        const prev = new Decimal(line.invoicedQty ?? '0')
        const add = new Decimal(w.quantity)
        await tx
          .update(soItems)
          .set({ invoicedQty: prev.plus(add).toString() })
          .where(eq(soItems.id, w.lineId))
      }

      const updatedLines = await tx.select().from(soItems).where(eq(soItems.soId, salesOrderId))
      let allInvoiced = true
      for (const L of updatedLines) {
        if (new Decimal(L.quantity).gt(new Decimal(L.invoicedQty ?? '0'))) allInvoiced = false
      }
      const nextSoStatus = allInvoiced ? 'invoiced' : 'partially_invoiced'
      await tx
        .update(salesOrders)
        .set({ status: nextSoStatus, updatedAt: new Date() })
        .where(eq(salesOrders.id, salesOrderId))

      return {
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNumber,
        salesOrderId,
        salesOrderStatus: nextSoStatus,
      }
    })

    return result
  },

  async listPayments(invoiceId: string): Promise<InvoicePaymentApi[]> {
    const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) })
    if (!inv) throw new NotFoundError('invoice')
    const rows = await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId))
      .orderBy(desc(invoicePayments.paymentDate), desc(invoicePayments.createdAt))
    return rows.map(mapPaymentRow)
  },

  async recordPayment(
    invoiceId: string,
    body: {
      paymentDate: string
      amount: number
      paymentMethod: string
      bankAccountId?: string
      referenceNo?: string
      notes?: string
    }
  ): Promise<RecordPaymentResult> {
    if (!body.paymentMethod?.trim()) {
      throw new ValidationError({ paymentMethod: ['Required'] })
    }
    const amt = new Decimal(body.amount)
    if (!amt.isFinite() || amt.lte(0)) {
      throw new ValidationError({ amount: ['Amount must be > 0'] })
    }

    const payDate = new Date(body.paymentDate)
    if (Number.isNaN(payDate.getTime())) {
      throw new ValidationError({ paymentDate: ['Invalid date'] })
    }
    const endToday = new Date()
    endToday.setHours(23, 59, 59, 999)
    if (payDate > endToday) {
      throw new ValidationError({ paymentDate: ['Payment date cannot be in the future'] })
    }

    return await db.transaction(async (tx) => {
      const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1).for('update')
      if (!inv) throw new NotFoundError('invoice')
      if (inv.status === 'cancelled' || inv.status === 'draft') {
        throw new AppError('INVOICE_NOT_PAYABLE', 'Invoice cannot receive payments in this status', 400)
      }
      const total = new Decimal(inv.total)
      const paid = new Decimal(inv.paidAmount)
      const balance = total.minus(paid)
      if (balance.lte(0)) {
        throw new ValidationError({ amount: ['Payment exceeds outstanding balance (invoice is already paid)'] })
      }
      if (amt.gt(balance)) {
        throw new ValidationError({ amount: [`Amount exceeds balance (${balance.toFixed(2)})`] })
      }

      const newPaid = paid.plus(amt)
      const nextStatus = computeDbStatusAfterPayment({
        ...inv,
        paidAmount: newPaid.toFixed(2),
      })

      const [payRow] = await tx
        .insert(invoicePayments)
        .values({
          invoiceId,
          paymentDate: payDate,
          amount: amt.toFixed(2),
          paymentMethod: body.paymentMethod.trim(),
          bankAccountId: body.bankAccountId?.trim() || null,
          referenceNo: body.referenceNo?.trim() || null,
          notes: body.notes?.trim() || null,
        })
        .returning({ id: invoicePayments.id })

      const bankId = body.bankAccountId?.trim()
      if (bankId) {
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRe.test(bankId)) {
          throw new ValidationError({ bankAccountId: ['รูปแบบ bank account id ไม่ถูกต้อง'] })
        }
        if (!payRow?.id) throw new ValidationError({ _: ['บันทึกการชำระไม่สำเร็จ'] })
        const desc = `รับชำระใบแจ้งหนี้ ${inv.invoiceNumber}`
        const { BankAccountService } = await import('../bank-account/bank-account.service')
        await BankAccountService.appendArDepositFromInvoicePayment(tx, {
          bankAccountId: bankId,
          paymentId: payRow.id,
          amount: amt.toFixed(2),
          paymentDate: payDate,
          description: desc,
        })
      }

      await tx
        .update(invoices)
        .set({
          paidAmount: newPaid.toFixed(2),
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId))

      const balanceDue = total.minus(newPaid).toNumber()
      const apiStatus = dbStatusToApi(nextStatus, inv.dueDate, newPaid.toFixed(2), inv.total)
      return {
        invoiceId,
        paidAmount: newPaid.toNumber(),
        balanceDue,
        invoiceStatus: apiStatus,
      }
    })
  },

  async updateStatus(invoiceId: string, body: { status: 'sent' | 'cancelled' }): Promise<InvoiceApi> {
    const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) })
    if (!inv) throw new NotFoundError('invoice')
    const paid = new Decimal(inv.paidAmount)

    if (body.status === 'sent') {
      if (inv.status !== 'draft') {
        throw new AppError('INVALID_TRANSITION', 'Only draft invoices can be issued', 400)
      }
      await db
        .update(invoices)
        .set({ status: 'issued', updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId))
    } else if (body.status === 'cancelled') {
      if (paid.gt(0)) {
        throw new AppError('INVOICE_HAS_PAYMENTS', 'Cannot cancel an invoice with payments', 400)
      }
      if (!['draft', 'issued', 'partially_paid', 'overdue'].includes(inv.status)) {
        throw new AppError('INVALID_TRANSITION', 'Invoice cannot be cancelled from this status', 400)
      }
      await db
        .update(invoices)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId))
    } else {
      throw new ValidationError({ status: ['Unsupported status'] })
    }

    const row = await db
      .select({ inv: invoices, custName: customers.name })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, invoiceId))
      .limit(1)
    const first = row[0]
    if (!first) throw new NotFoundError('invoice')
    return toApiFull(first.inv, first.custName)
  },

  async buildPdfBuffer(id: string): Promise<Buffer> {
    const inv = await InvoiceService.getById(id)
    const { buildAsciiPdf } = await import('../tax/tax-pdf')
    const lines = [
      'INVOICE (ASCII preview PDF)',
      `Number: ${inv.invoiceNumber}`,
      `Customer: ${inv.customerName}`,
      `Issue: ${inv.issueDate}  Due: ${inv.dueDate}`,
      `Status: ${inv.status}`,
      `Subtotal: ${inv.subtotal}  VAT: ${inv.vatAmount}  WHT: ${inv.whtAmount}`,
      `Total: ${inv.grandTotal}  Paid: ${inv.paidAmount}  Balance: ${inv.balanceDue}`,
      '---',
      ...inv.items.map(
        (it) =>
          `${it.description} | qty ${it.quantity} @ ${it.unitPrice} => ${it.amount} (VAT ${it.vatRate}%)`
      ),
    ]
    return buildAsciiPdf(lines)
  },
}
