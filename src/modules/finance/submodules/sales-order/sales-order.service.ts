import { and, count, desc, eq, ilike, isNull, like, or, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { customers, invoices, salesOrders, soItems } from '../../finance.schema'
import { InvoiceService } from '../invoice/invoice.service'

type SoDbStatus = 'draft' | 'confirmed' | 'partially_invoiced' | 'invoiced' | 'cancelled'

export type SoItemApi = {
  id: string
  itemNo: number
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  vatRate: number
  invoicedQty: number
  remainingQty: number
}

export type LinkedInvoiceApi = {
  id: string
  invoiceNo: string
  status: string
  totalAmount: number
}

export type SalesOrderListItem = {
  id: string
  soNo: string
  customerId: string
  customerCode?: string
  customerName: string
  orderDate: string
  deliveryDate?: string
  subtotalBeforeVat: number
  vatAmount: number
  totalAmount: number
  status: SoDbStatus
  updatedAt: string
}

export type SalesOrderDetail = SalesOrderListItem & {
  quotationId?: string
  notes?: string
  items: SoItemApi[]
  linkedInvoices: LinkedInvoiceApi[]
  createdAt: string
}

type ItemInput = {
  description: string
  quantity: number
  unitPrice: number
  vatRate?: number
}

function round2(n: Decimal): string {
  return n.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()
}

function computeSoLines(items: ItemInput[]): {
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

async function nextSoNo(orderDate: Date): Promise<string> {
  const y = orderDate.getFullYear()
  const pattern = `SO-${y}-%`
  const [row] = await db.select({ c: count() }).from(salesOrders).where(like(salesOrders.soNo, pattern))
  const n = Number(row?.c ?? 0) + 1
  return `SO-${y}-${String(n).padStart(4, '0')}`
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

function mapSoItem(line: typeof soItems.$inferSelect): SoItemApi {
  const qty = Number(line.quantity)
  const inv = Number(line.invoicedQty ?? '0')
  const lineSub = new Decimal(line.quantity).mul(line.unitPrice)
  const rate = new Decimal(line.vatRate)
  const lineVat = lineSub.mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const lineTotal = lineSub.plus(lineVat).toNumber()
  return {
    id: line.id,
    itemNo: line.itemNo,
    description: line.description,
    quantity: qty,
    unitPrice: Number(line.unitPrice),
    lineTotal,
    vatRate: Number(line.vatRate),
    invoicedQty: inv,
    remainingQty: Math.max(0, qty - inv),
  }
}

export const SalesOrderService = {
  async list(query: {
    page?: number
    limit?: number
    perPage?: number
    search?: string
    status?: string
    customerId?: string
  }): Promise<PaginatedResult<SalesOrderListItem>> {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? query.perPage ?? 20, 100)
    const offset = (page - 1) * limit

    const conditions = [isNull(customers.deletedAt)]
    if (query.customerId) conditions.push(eq(salesOrders.customerId, query.customerId))
    if (query.status) conditions.push(eq(salesOrders.status, query.status))
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`
      conditions.push(
        or(ilike(salesOrders.soNo, term), ilike(customers.name, term), ilike(customers.code, term))!
      )
    }

    const whereClause = and(...conditions)

    const [countRow] = await db
      .select({ c: count() })
      .from(salesOrders)
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(whereClause)

    const total = Number(countRow?.c ?? 0)
    const rows = await db
      .select({
        so: salesOrders,
        customerName: customers.name,
        customerCode: customers.code,
      })
      .from(salesOrders)
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(salesOrders.updatedAt))
      .limit(limit)
      .offset(offset)

    const data: SalesOrderListItem[] = rows.map((row) => {
      const d: SalesOrderListItem = {
        id: row.so.id,
        soNo: row.so.soNo,
        customerId: row.so.customerId,
        customerCode: row.customerCode ?? undefined,
        customerName: row.customerName,
        orderDate: row.so.orderDate.toISOString().slice(0, 10),
        subtotalBeforeVat: Number(row.so.subtotalBeforeVat),
        vatAmount: Number(row.so.vatAmount),
        totalAmount: Number(row.so.totalAmount),
        status: row.so.status as SoDbStatus,
        updatedAt: row.so.updatedAt.toISOString(),
      }
      if (row.so.deliveryDate) d.deliveryDate = row.so.deliveryDate.toISOString().slice(0, 10)
      return d
    })

    return {
      data,
      meta: { page, perPage: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  },

  async getById(id: string): Promise<SalesOrderDetail> {
    const row = await db
      .select({
        so: salesOrders,
        customerName: customers.name,
        customerCode: customers.code,
      })
      .from(salesOrders)
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(eq(salesOrders.id, id))
      .limit(1)

    const first = row[0]
    if (!first) throw new NotFoundError('sales order')

    const lines = await db
      .select()
      .from(soItems)
      .where(eq(soItems.soId, id))
      .orderBy(soItems.itemNo)

    const invRows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
      })
      .from(invoices)
      .where(eq(invoices.salesOrderId, id))

    const linkedInvoices: LinkedInvoiceApi[] = invRows.map((r) => ({
      id: r.id,
      invoiceNo: r.invoiceNumber,
      status: r.status,
      totalAmount: Number(r.total),
    }))

    const base: SalesOrderDetail = {
      id: first.so.id,
      soNo: first.so.soNo,
      customerId: first.so.customerId,
      customerCode: first.customerCode ?? undefined,
      customerName: first.customerName,
      orderDate: first.so.orderDate.toISOString().slice(0, 10),
      subtotalBeforeVat: Number(first.so.subtotalBeforeVat),
      vatAmount: Number(first.so.vatAmount),
      totalAmount: Number(first.so.totalAmount),
      status: first.so.status as SoDbStatus,
      updatedAt: first.so.updatedAt.toISOString(),
      items: lines.map(mapSoItem),
      linkedInvoices,
      createdAt: first.so.createdAt.toISOString(),
    }
    if (first.so.deliveryDate) base.deliveryDate = first.so.deliveryDate.toISOString().slice(0, 10)
    if (first.so.quotationId) base.quotationId = first.so.quotationId
    if (first.so.notes) base.notes = first.so.notes
    return base
  },

  async create(
    body: {
      customerId: string
      orderDate: string
      deliveryDate?: string
      notes?: string
      items: ItemInput[]
    },
    createdBy: string
  ): Promise<{ id: string; soNo: string; creditWarning?: string }> {
    await assertCustomerSelectable(body.customerId)
    if (!body.items?.length) throw new ValidationError({ items: ['ต้องมีอย่างน้อย 1 รายการ'] })

    const od = new Date(body.orderDate)
    if (Number.isNaN(od.getTime())) throw new ValidationError({ orderDate: ['วันที่ไม่ถูกต้อง'] })

    for (const it of body.items) {
      if (!it.description?.trim()) throw new ValidationError({ items: ['รายการต้องมีคำอธิบาย'] })
      const qty = new Decimal(it.quantity)
      const price = new Decimal(it.unitPrice)
      if (qty.lte(0) || price.lt(0)) throw new ValidationError({ items: ['จำนวนและราคาต้องถูกต้อง'] })
    }

    const totals = computeSoLines(body.items)
    const soNo = await nextSoNo(od)

    const [c] = await db.select().from(customers).where(eq(customers.id, body.customerId)).limit(1)
    let warn: string | undefined
    if (c) {
      const [arRow] = await db
        .select({
          openTotal: sql<string>`coalesce(sum(${invoices.total}::numeric - ${invoices.paidAmount}::numeric), 0)`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, body.customerId),
            sql`${invoices.status} NOT IN ('paid','cancelled','draft')`,
            sql`${invoices.total}::numeric > ${invoices.paidAmount}::numeric`
          )!
        )
      const openAr = new Decimal(arRow?.openTotal ?? '0')
      const limit = new Decimal(c.creditLimit)
      if (openAr.gt(limit)) warn = 'over_credit_limit'
    }

    const [so] = await db
      .insert(salesOrders)
      .values({
        soNo,
        customerId: body.customerId,
        quotationId: null,
        createdBy,
        orderDate: od,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        status: 'draft',
        subtotalBeforeVat: totals.subtotalBeforeVat,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        notes: body.notes ?? null,
      })
      .returning()

    if (!so) throw new Error('สร้าง sales order ไม่สำเร็จ')

    await db.insert(soItems).values(
      totals.rows.map((r) => ({
        soId: so.id,
        itemNo: r.itemNo,
        description: r.description,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        lineTotal: r.lineTotal,
        vatRate: r.vatRate,
        invoicedQty: '0',
      }))
    )

    const out: { id: string; soNo: string; creditWarning?: string } = { id: so.id, soNo: so.soNo }
    if (warn) out.creditWarning = warn
    return out
  },

  async createFromQuotation(
    body: {
      customerId: string
      quotationId: string
      orderDate: string
      deliveryDate?: string
      notes?: string
      items: ItemInput[]
    },
    createdBy: string,
    initialStatus: 'draft' | 'confirmed'
  ): Promise<{ id: string; soNo: string }> {
    await assertCustomerSelectable(body.customerId)
    const od = new Date(body.orderDate)
    if (Number.isNaN(od.getTime())) throw new ValidationError({ orderDate: ['วันที่ไม่ถูกต้อง'] })

    const totals = computeSoLines(body.items)
    const soNo = await nextSoNo(od)

    const [so] = await db
      .insert(salesOrders)
      .values({
        soNo,
        customerId: body.customerId,
        quotationId: body.quotationId,
        createdBy,
        orderDate: od,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        status: initialStatus,
        subtotalBeforeVat: totals.subtotalBeforeVat,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        notes: body.notes ?? null,
      })
      .returning()

    if (!so) throw new Error('สร้าง sales order ไม่สำเร็จ')

    await db.insert(soItems).values(
      totals.rows.map((r) => ({
        soId: so.id,
        itemNo: r.itemNo,
        description: r.description,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        lineTotal: r.lineTotal,
        vatRate: r.vatRate,
        invoicedQty: '0',
      }))
    )

    return { id: so.id, soNo: so.soNo }
  },

  async updateStatus(id: string, status: 'confirmed' | 'cancelled'): Promise<SalesOrderDetail> {
    const [existing] = await db.select().from(salesOrders).where(eq(salesOrders.id, id)).limit(1)
    if (!existing) throw new NotFoundError('sales order')

    if (status === 'confirmed') {
      if (existing.status !== 'draft') {
        throw new AppError('SO_INVALID_TRANSITION', 'ยืนยันได้เฉพาะ draft', 400)
      }
    } else if (status === 'cancelled') {
      if (existing.status === 'invoiced' || existing.status === 'partially_invoiced') {
        throw new AppError('SO_CANNOT_CANCEL', 'ไม่สามารถยกเลิก SO ที่มี invoice แล้ว', 400)
      }
    }

    await db
      .update(salesOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(salesOrders.id, id))

    return SalesOrderService.getById(id)
  },

  async convertToInvoice(salesOrderId: string) {
    const data = await InvoiceService.createFromSalesOrder(salesOrderId)
    return {
      invoiceId: data.invoiceId,
      invoiceNo: data.invoiceNo,
      salesOrderId: data.salesOrderId,
      salesOrderStatus: data.salesOrderStatus,
    }
  },
}
