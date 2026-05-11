import { and, count, desc, eq, ilike, isNull, like, or, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { customers, invoices, quotations, quotationItems, salesOrders } from '../../finance.schema'
import { SalesOrderService } from '../sales-order/sales-order.service'

type QuotationDbStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export type QuotationItemApi = {
  id: string
  itemNo: number
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  vatRate: number
}

export type QuotationListItem = {
  id: string
  quotNo: string
  customerId: string
  customerCode?: string
  customerName: string
  issueDate: string
  validUntil: string
  subtotalBeforeVat: number
  vatAmount: number
  totalAmount: number
  status: QuotationDbStatus | 'expired'
  updatedAt: string
}

export type QuotationDetail = QuotationListItem & {
  notes?: string
  termsAndConditions?: string
  items: QuotationItemApi[]
  createdBy: string
  createdAt: string
  customerSnapshot?: { code: string; name: string }
  salesOrderId?: string
}

export type QuotationCreateResult = {
  id: string
  quotNo: string
  status: string
  creditWarning?: string
}

function round2(n: Decimal): string {
  return n.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function effectiveQuotationStatus(
  stored: string,
  validUntil: Date
): QuotationListItem['status'] {
  const s = stored as QuotationDbStatus
  if (s === 'accepted' || s === 'rejected') return s
  const vu = startOfLocalDay(validUntil)
  const today = startOfLocalDay(new Date())
  if ((s === 'draft' || s === 'sent') && vu < today) return 'expired'
  return s
}

async function openArForCustomer(customerId: string): Promise<Decimal> {
  const [row] = await db
    .select({
      openTotal: sql<string>`coalesce(sum(${invoices.total}::numeric - ${invoices.paidAmount}::numeric), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, customerId),
        sql`${invoices.status} NOT IN ('paid','cancelled','draft')`,
        sql`${invoices.total}::numeric > ${invoices.paidAmount}::numeric`
      )!
    )
  return new Decimal(row?.openTotal ?? '0')
}

async function creditWarningForCustomer(customerId: string): Promise<'over_credit_limit' | undefined> {
  const [c] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!c) return undefined
  const openAr = await openArForCustomer(customerId)
  const limit = new Decimal(c.creditLimit)
  return openAr.gt(limit) ? 'over_credit_limit' : undefined
}

async function nextQuotNo(issueDate: Date): Promise<string> {
  const y = issueDate.getFullYear()
  const pattern = `QT-${y}-%`
  const [row] = await db
    .select({ c: count() })
    .from(quotations)
    .where(like(quotations.quotNo, pattern))
  const n = Number(row?.c ?? 0) + 1
  return `QT-${y}-${String(n).padStart(4, '0')}`
}

type ItemInput = {
  description: string
  quantity: number
  unitPrice: number
  vatRate?: number
}

function computeQuotationLines(items: ItemInput[]): {
  subtotalBeforeVat: string
  vatAmount: string
  totalAmount: string
  rows: Array<{
    itemNo: number
    description: string
    quantity: string
    unitPrice: string
    lineTotal: string
    vatRate: string
  }>
} {
  let subEx = new Decimal(0)
  let vatTot = new Decimal(0)
  const rows: Array<{
    itemNo: number
    description: string
    quantity: string
    unitPrice: string
    lineTotal: string
    vatRate: string
  }> = []

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!
    const qty = new Decimal(it.quantity)
    const price = new Decimal(it.unitPrice)
    const rate = new Decimal(it.vatRate ?? 7)
    const lineSub = qty.mul(price)
    const lineVat = lineSub.mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    const lineTotal = lineSub.plus(lineVat).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    subEx = subEx.plus(lineSub)
    vatTot = vatTot.plus(lineVat)
    rows.push({
      itemNo: i + 1,
      description: it.description.trim(),
      quantity: qty.toString(),
      unitPrice: price.toString(),
      lineTotal: lineTotal.toString(),
      vatRate: rate.toString(),
    })
  }
  const total = subEx.plus(vatTot)
  return {
    subtotalBeforeVat: round2(subEx),
    vatAmount: round2(vatTot),
    totalAmount: round2(total),
    rows,
  }
}

async function assertCustomerSelectable(customerId: string) {
  const [cust] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), isNull(customers.deletedAt)))
    .limit(1)
  if (!cust) throw new ValidationError({ customerId: ['ไม่พบลูกค้า'] })
  if (!cust.isActive) throw new ValidationError({ customerId: ['ลูกค้าถูกปิดการใช้งาน'] })
  return cust
}

function mapItemRow(line: typeof quotationItems.$inferSelect): QuotationItemApi {
  return {
    id: line.id,
    itemNo: line.itemNo,
    description: line.description,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    lineTotal: Number(line.lineTotal),
    vatRate: Number(line.vatRate),
  }
}

async function linkedSalesOrderId(quotationId: string): Promise<string | undefined> {
  const [so] = await db
    .select({ id: salesOrders.id })
    .from(salesOrders)
    .where(eq(salesOrders.quotationId, quotationId))
    .limit(1)
  return so?.id
}

export const QuotationService = {
  async list(query: {
    page?: number
    limit?: number
    perPage?: number
    search?: string
    status?: string
    customerId?: string
  }): Promise<PaginatedResult<QuotationListItem>> {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? query.perPage ?? 20, 100)
    const offset = (page - 1) * limit

    const conditions = [isNull(customers.deletedAt)]
    if (query.customerId) conditions.push(eq(quotations.customerId, query.customerId))
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`
      conditions.push(
        or(ilike(quotations.quotNo, term), ilike(customers.name, term), ilike(customers.code, term))!
      )
    }
    const st = query.status
    if (st === 'expired') {
      conditions.push(or(eq(quotations.status, 'draft'), eq(quotations.status, 'sent'))!)
      conditions.push(sql`date_trunc('day', ${quotations.validUntil}) < date_trunc('day', now())`)
    } else if (st === 'sent') {
      conditions.push(eq(quotations.status, 'sent'))
      conditions.push(sql`date_trunc('day', ${quotations.validUntil}) >= date_trunc('day', now())`)
    } else if (st === 'draft') {
      conditions.push(eq(quotations.status, 'draft'))
      conditions.push(sql`date_trunc('day', ${quotations.validUntil}) >= date_trunc('day', now())`)
    } else if (st) {
      conditions.push(eq(quotations.status, st))
    }

    const whereClause = and(...conditions)

    const [countRow] = await db
      .select({ c: count() })
      .from(quotations)
      .innerJoin(customers, eq(quotations.customerId, customers.id))
      .where(whereClause)

    const total = Number(countRow?.c ?? 0)
    const rows = await db
      .select({
        q: quotations,
        customerName: customers.name,
        customerCode: customers.code,
      })
      .from(quotations)
      .innerJoin(customers, eq(quotations.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(quotations.updatedAt))
      .limit(limit)
      .offset(offset)

    const data: QuotationListItem[] = rows.map((row) => ({
      id: row.q.id,
      quotNo: row.q.quotNo,
      customerId: row.q.customerId,
      customerCode: row.customerCode ?? undefined,
      customerName: row.customerName,
      issueDate: row.q.issueDate.toISOString().slice(0, 10),
      validUntil: row.q.validUntil.toISOString().slice(0, 10),
      subtotalBeforeVat: Number(row.q.subtotalBeforeVat),
      vatAmount: Number(row.q.vatAmount),
      totalAmount: Number(row.q.totalAmount),
      status: effectiveQuotationStatus(row.q.status, row.q.validUntil),
      updatedAt: row.q.updatedAt.toISOString(),
    }))

    return {
      data,
      meta: {
        page,
        perPage: limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  },

  async getById(id: string): Promise<QuotationDetail> {
    const row = await db
      .select({
        q: quotations,
        customerName: customers.name,
        customerCode: customers.code,
      })
      .from(quotations)
      .innerJoin(customers, eq(quotations.customerId, customers.id))
      .where(eq(quotations.id, id))
      .limit(1)

    const first = row[0]
    if (!first) throw new NotFoundError('quotation')

    const lines = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, id))
      .orderBy(quotationItems.itemNo)

    const soId = await linkedSalesOrderId(id)
    const eff = effectiveQuotationStatus(first.q.status, first.q.validUntil)

    const base: QuotationDetail = {
      id: first.q.id,
      quotNo: first.q.quotNo,
      customerId: first.q.customerId,
      customerCode: first.customerCode ?? undefined,
      customerName: first.customerName,
      issueDate: first.q.issueDate.toISOString().slice(0, 10),
      validUntil: first.q.validUntil.toISOString().slice(0, 10),
      subtotalBeforeVat: Number(first.q.subtotalBeforeVat),
      vatAmount: Number(first.q.vatAmount),
      totalAmount: Number(first.q.totalAmount),
      status: eff,
      updatedAt: first.q.updatedAt.toISOString(),
      items: lines.map(mapItemRow),
      createdBy: first.q.createdBy,
      createdAt: first.q.createdAt.toISOString(),
      customerSnapshot: {
        code: first.customerCode ?? '',
        name: first.customerName,
      },
      ...(soId ? { salesOrderId: soId } : {}),
    }
    if (first.q.notes) base.notes = first.q.notes
    if (first.q.termsAndConditions) base.termsAndConditions = first.q.termsAndConditions
    return base
  },

  async create(
    body: {
      customerId: string
      issueDate: string
      validUntil: string
      notes?: string
      termsAndConditions?: string
      items: ItemInput[]
    },
    createdBy: string
  ): Promise<QuotationCreateResult> {
    await assertCustomerSelectable(body.customerId)
    if (!body.items?.length) throw new ValidationError({ items: ['ต้องมีอย่างน้อย 1 รายการ'] })

    const issue = new Date(body.issueDate)
    const valid = new Date(body.validUntil)
    if (Number.isNaN(issue.getTime()) || Number.isNaN(valid.getTime())) {
      throw new ValidationError({ dates: ['วันที่ไม่ถูกต้อง'] })
    }
    if (startOfLocalDay(valid) < startOfLocalDay(issue)) {
      throw new ValidationError({ validUntil: ['validUntil ต้องไม่น้อยกว่า issueDate'] })
    }

    for (const it of body.items) {
      if (!it.description?.trim()) throw new ValidationError({ items: ['รายการต้องมีคำอธิบาย'] })
      const qty = new Decimal(it.quantity)
      const price = new Decimal(it.unitPrice)
      if (qty.lte(0) || price.lt(0)) throw new ValidationError({ items: ['จำนวนและราคาต้องถูกต้อง'] })
    }

    const totals = computeQuotationLines(body.items)
    const quotNo = await nextQuotNo(issue)
    const creditWarning = await creditWarningForCustomer(body.customerId)

    const [q] = await db
      .insert(quotations)
      .values({
        quotNo,
        customerId: body.customerId,
        createdBy,
        issueDate: issue,
        validUntil: valid,
        status: 'draft',
        subtotalBeforeVat: totals.subtotalBeforeVat,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        notes: body.notes ?? null,
        termsAndConditions: body.termsAndConditions ?? null,
      })
      .returning()

    if (!q) throw new Error('สร้าง quotation ไม่สำเร็จ')

    await db.insert(quotationItems).values(
      totals.rows.map((r) => ({
        quotationId: q.id,
        itemNo: r.itemNo,
        description: r.description,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        lineTotal: r.lineTotal,
        vatRate: r.vatRate,
      }))
    )

    const out: QuotationCreateResult = { id: q.id, quotNo: q.quotNo, status: 'draft' }
    if (creditWarning) out.creditWarning = creditWarning
    return out
  },

  async update(
    id: string,
    body: {
      customerId?: string
      issueDate?: string
      validUntil?: string
      notes?: string
      termsAndConditions?: string
      items?: ItemInput[]
    }
  ): Promise<{ id: string }> {
    const [existing] = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1)
    if (!existing) throw new NotFoundError('quotation')
    if (existing.status !== 'draft') {
      throw new AppError('QUOTATION_NOT_EDITABLE', 'แก้ไขได้เฉพาะสถานะ draft', 400)
    }

    if (body.customerId) await assertCustomerSelectable(body.customerId)

    const issue = body.issueDate ? new Date(body.issueDate) : existing.issueDate
    const valid = body.validUntil ? new Date(body.validUntil) : existing.validUntil
    if (body.issueDate || body.validUntil) {
      if (Number.isNaN(issue.getTime()) || Number.isNaN(valid.getTime())) {
        throw new ValidationError({ dates: ['วันที่ไม่ถูกต้อง'] })
      }
      if (startOfLocalDay(valid) < startOfLocalDay(issue)) {
        throw new ValidationError({ validUntil: ['validUntil ต้องไม่น้อยกว่า issueDate'] })
      }
    }

    let totals:
      | ReturnType<typeof computeQuotationLines>
      | undefined
    if (body.items) {
      if (!body.items.length) throw new ValidationError({ items: ['ต้องมีอย่างน้อย 1 รายการ'] })
      for (const it of body.items) {
        if (!it.description?.trim()) throw new ValidationError({ items: ['รายการต้องมีคำอธิบาย'] })
        const qty = new Decimal(it.quantity)
        const price = new Decimal(it.unitPrice)
        if (qty.lte(0) || price.lt(0)) throw new ValidationError({ items: ['จำนวนและราคาต้องถูกต้อง'] })
      }
      totals = computeQuotationLines(body.items)
    }

    await db.transaction(async (tx) => {
      const patch: Partial<typeof quotations.$inferInsert> = {
        updatedAt: new Date(),
      }
      if (body.customerId) patch.customerId = body.customerId
      if (body.issueDate) patch.issueDate = issue
      if (body.validUntil) patch.validUntil = valid
      if (body.notes !== undefined) patch.notes = body.notes || null
      if (body.termsAndConditions !== undefined) patch.termsAndConditions = body.termsAndConditions || null
      if (totals) {
        patch.subtotalBeforeVat = totals.subtotalBeforeVat
        patch.vatAmount = totals.vatAmount
        patch.totalAmount = totals.totalAmount
      }
      await tx.update(quotations).set(patch).where(eq(quotations.id, id))

      if (totals) {
        await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id))
        await tx.insert(quotationItems).values(
          totals.rows.map((r) => ({
            quotationId: id,
            itemNo: r.itemNo,
            description: r.description,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
            lineTotal: r.lineTotal,
            vatRate: r.vatRate,
          }))
        )
      }
    })

    return { id }
  },

  async updateStatus(id: string, status: 'sent' | 'accepted' | 'rejected'): Promise<QuotationDetail> {
    const [existing] = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1)
    if (!existing) throw new NotFoundError('quotation')

    const eff = effectiveQuotationStatus(existing.status, existing.validUntil)
    if (eff === 'expired') {
      throw new AppError('QUOTATION_EXPIRED', 'Quotation หมดอายุแล้ว', 400)
    }

    if (status === 'sent') {
      if (existing.status !== 'draft') {
        throw new AppError('QUOTATION_INVALID_TRANSITION', 'ส่งได้เฉพาะ draft', 400)
      }
    } else if (status === 'accepted' || status === 'rejected') {
      if (existing.status !== 'sent') {
        throw new AppError('QUOTATION_INVALID_TRANSITION', 'รับ/ปฏิเสธได้เฉพาะ sent', 400)
      }
    }

    await db
      .update(quotations)
      .set({ status, updatedAt: new Date() })
      .where(eq(quotations.id, id))

    return QuotationService.getById(id)
  },

  async convertToSo(id: string, createdBy: string) {
    const [q] = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1)
    if (!q) throw new NotFoundError('quotation')

    const eff = effectiveQuotationStatus(q.status, q.validUntil)
    if (eff === 'expired' || q.status === 'rejected') {
      throw new AppError('QUOTATION_NOT_CONVERTIBLE', 'Quotation นี้แปลงเป็น SO ไม่ได้', 422)
    }
    if (q.status !== 'sent' && q.status !== 'accepted') {
      throw new AppError('QUOTATION_NOT_CONVERTIBLE', 'ต้องเป็น sent หรือ accepted ก่อนแปลง', 422)
    }

    const [dup] = await db
      .select({ id: salesOrders.id })
      .from(salesOrders)
      .where(eq(salesOrders.quotationId, id))
      .limit(1)
    if (dup) throw new AppError('QUOTATION_ALREADY_CONVERTED', 'มี SO จาก quotation นี้แล้ว', 409)

    const lines = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, id))
      .orderBy(quotationItems.itemNo)

    if (!lines.length) throw new AppError('QUOTATION_EMPTY', 'ไม่มีรายการสินค้า', 400)

    const orderDate = new Date()
    const soPayload: Parameters<typeof SalesOrderService.createFromQuotation>[0] = {
      customerId: q.customerId,
      quotationId: id,
      orderDate: orderDate.toISOString().slice(0, 10),
      items: lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        vatRate: Number(l.vatRate),
      })),
    }
    if (q.notes != null && q.notes !== '') soPayload.notes = q.notes
    const so = await SalesOrderService.createFromQuotation(soPayload, createdBy, 'confirmed')

    await db
      .update(quotations)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(quotations.id, id))

    return {
      salesOrderId: so.id,
      soNo: so.soNo,
      quotationId: id,
      quotationStatus: 'accepted' as const,
    }
  },
}
