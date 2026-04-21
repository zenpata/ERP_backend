import { and, count, desc, eq, gte, ilike, inArray, isNull, like, lte, ne, or, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import {
  apBills,
  goodsReceipts,
  grItems,
  poItems,
  purchaseOrders,
  vendors,
} from '../../finance.schema'

type PoStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled'

export type PoItemApi = {
  id: string
  itemNo: number
  description: string
  quantity: number
  unit?: string
  unitPrice: number
  lineTotal: number
  receivedQty: number
  remainingQty: number
}

export type PoListItem = {
  id: string
  poNo: string
  vendorId: string
  vendorSummary: { name: string; code: string }
  issueDate: string
  expectedDeliveryDate?: string
  status: PoStatus
  totalAmount: number
  updatedAt: string
}

export type PoOption = {
  id: string
  poNo: string
  vendorName: string
  status: string
  remainingAmountToBill: number
}

export type GrItemApi = {
  poItemId: string
  receivedQty: number
  notes?: string
}

export type GoodsReceiptApi = {
  id: string
  grNo: string
  receivedDate: string
  receivedBy: string
  notes?: string
  items: Array<{ poItemId: string; receivedQty: number; notes?: string }>
  createdAt: string
}

export type ApBillLinkApi = {
  id: string
  documentNo: string
  status: string
  totalAmount: number
  paidAmount: number
}

export type PoDetail = PoListItem & {
  departmentId?: string
  projectBudgetId?: string
  notes?: string
  requestedBy: string
  approvedBy?: string
  approvedAt?: string
  subtotal: number
  vatAmount: number
  items: PoItemApi[]
  goodsReceipts: GoodsReceiptApi[]
  linkedApBills: ApBillLinkApi[]
  createdAt: string
}

export type BudgetImpactStub = {
  budgetId: string | null
  committedDelta: number
  actualSpendDelta: number
  refreshedBudgetSummary: Record<string, unknown> | null
}

function round2(n: Decimal): string {
  return n.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()
}

async function nextPoNo(issueDate: Date): Promise<string> {
  const y = issueDate.getFullYear()
  const pattern = `PO-${y}-%`
  const [row] = await db.select({ c: count() }).from(purchaseOrders).where(like(purchaseOrders.poNo, pattern))
  const n = Number(row?.c ?? 0) + 1
  return `PO-${y}-${String(n).padStart(4, '0')}`
}

async function nextGrNo(receivedDate: Date): Promise<string> {
  const y = receivedDate.getFullYear()
  const pattern = `GR-${y}-%`
  const [row] = await db.select({ c: count() }).from(goodsReceipts).where(like(goodsReceipts.grNo, pattern))
  const n = Number(row?.c ?? 0) + 1
  return `GR-${y}-${String(n).padStart(4, '0')}`
}

type ItemIn = { description: string; quantity: number; unit?: string; unitPrice: number }

function computePoTotals(items: ItemIn[], vatRatePct = 7): {
  subtotal: string
  vatAmount: string
  totalAmount: string
  rows: Array<{
    itemNo: number
    description: string
    quantity: string
    unit: string | null
    unitPrice: string
    lineTotal: string
  }>
} {
  let sub = new Decimal(0)
  const rows: Array<{
    itemNo: number
    description: string
    quantity: string
    unit: string | null
    unitPrice: string
    lineTotal: string
  }> = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!
    const qty = new Decimal(it.quantity)
    const price = new Decimal(it.unitPrice)
    const line = qty.mul(price).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    sub = sub.plus(line)
    rows.push({
      itemNo: i + 1,
      description: it.description.trim(),
      quantity: qty.toString(),
      unit: it.unit?.trim() || null,
      unitPrice: price.toString(),
      lineTotal: line.toString(),
    })
  }
  const vat = sub.mul(vatRatePct).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const total = sub.plus(vat)
  return {
    subtotal: round2(sub),
    vatAmount: round2(vat),
    totalAmount: round2(total),
    rows,
  }
}

function mapPoItem(row: typeof poItems.$inferSelect): PoItemApi {
  const qty = Number(row.quantity)
  const rec = Number(row.receivedQty ?? '0')
  return {
    id: row.id,
    itemNo: row.itemNo,
    description: row.description,
    quantity: qty,
    ...(row.unit != null && row.unit !== '' ? { unit: row.unit } : {}),
    unitPrice: Number(row.unitPrice),
    lineTotal: Number(row.lineTotal),
    receivedQty: rec,
    remainingQty: Math.max(0, qty - rec),
  }
}

async function loadGrsForPo(poId: string): Promise<GoodsReceiptApi[]> {
  const grs = await db
    .select()
    .from(goodsReceipts)
    .where(eq(goodsReceipts.poId, poId))
    .orderBy(desc(goodsReceipts.createdAt))
  const out: GoodsReceiptApi[] = []
  for (const gr of grs) {
    const lines = await db
      .select()
      .from(grItems)
      .where(eq(grItems.grId, gr.id))
    out.push({
      id: gr.id,
      grNo: gr.grNo,
      receivedDate: gr.receivedDate.toISOString().slice(0, 10),
      receivedBy: gr.receivedBy,
      ...(gr.notes != null && gr.notes !== '' ? { notes: gr.notes } : {}),
      items: lines.map((l) => ({
        poItemId: l.poItemId,
        receivedQty: Number(l.receivedQty),
        ...(l.notes != null && l.notes !== '' ? { notes: l.notes } : {}),
      })),
      createdAt: gr.createdAt.toISOString(),
    })
  }
  return out
}

async function linkedApBills(poId: string): Promise<ApBillLinkApi[]> {
  const rows = await db
    .select({
      id: apBills.id,
      referenceNumber: apBills.referenceNumber,
      status: apBills.status,
      totalAmount: apBills.totalAmount,
      paidAmount: apBills.paidAmount,
    })
    .from(apBills)
    .where(eq(apBills.poId, poId))
  return rows.map((r) => ({
    id: r.id,
    documentNo: r.referenceNumber,
    status: r.status,
    totalAmount: Number(r.totalAmount),
    paidAmount: Number(r.paidAmount),
  }))
}

async function sumBilledForPo(poId: string): Promise<Decimal> {
  const [row] = await db
    .select({
      s: sql<string>`coalesce(sum(${apBills.totalAmount}::numeric), 0)`,
    })
    .from(apBills)
    .where(and(eq(apBills.poId, poId), ne(apBills.status, 'rejected')))
  return new Decimal(row?.s ?? '0')
}

async function refreshPoReceivingStatus(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], poId: string) {
  const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1)
  if (!po) return
  if (!['approved', 'partially_received', 'received'].includes(po.status)) return

  const lines = await tx.select().from(poItems).where(eq(poItems.poId, poId)).orderBy(poItems.itemNo)
  let any = false
  let allFull = true
  for (const l of lines) {
    const q = new Decimal(l.quantity)
    const r = new Decimal(l.receivedQty ?? '0')
    if (r.gt(0)) any = true
    if (r.lt(q)) allFull = false
  }
  let next: PoStatus = po.status as PoStatus
  if (allFull && lines.length > 0) next = 'received'
  else if (any) next = 'partially_received'
  else next = 'approved'

  await tx
    .update(purchaseOrders)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(purchaseOrders.id, poId))
}

function stubBudgetImpact(po: typeof purchaseOrders.$inferSelect): BudgetImpactStub {
  return {
    budgetId: po.projectBudgetId ?? null,
    committedDelta: 0,
    actualSpendDelta: 0,
    refreshedBudgetSummary: null,
  }
}

export const PurchaseOrderService = {
  async list(query: {
    page?: number
    limit?: number
    perPage?: number
    status?: string
    vendorId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<PaginatedResult<PoListItem>> {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? query.perPage ?? 20, 100)
    const offset = (page - 1) * limit

    const conditions = [isNull(vendors.deletedAt)]
    if (query.vendorId) conditions.push(eq(purchaseOrders.vendorId, query.vendorId))
    if (query.status) conditions.push(eq(purchaseOrders.status, query.status))
    if (query.dateFrom) conditions.push(gte(purchaseOrders.issueDate, new Date(query.dateFrom)))
    if (query.dateTo) conditions.push(lte(purchaseOrders.issueDate, new Date(query.dateTo + 'T23:59:59')))

    const whereClause = and(...conditions)

    const [countRow] = await db
      .select({ c: count() })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(whereClause)

    const total = Number(countRow?.c ?? 0)
    const rows = await db
      .select({
        po: purchaseOrders,
        vname: vendors.name,
        vcode: vendors.code,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(whereClause)
      .orderBy(desc(purchaseOrders.updatedAt))
      .limit(limit)
      .offset(offset)

    const data: PoListItem[] = rows.map((r) => ({
      id: r.po.id,
      poNo: r.po.poNo,
      vendorId: r.po.vendorId,
      vendorSummary: { name: r.vname, code: r.vcode },
      issueDate: r.po.issueDate.toISOString().slice(0, 10),
      ...(r.po.expectedDeliveryDate
        ? { expectedDeliveryDate: r.po.expectedDeliveryDate.toISOString().slice(0, 10) }
        : {}),
      status: r.po.status as PoStatus,
      totalAmount: Number(r.po.totalAmount),
      updatedAt: r.po.updatedAt.toISOString(),
    }))

    return {
      data,
      meta: { page, perPage: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  },

  async options(): Promise<PoOption[]> {
    const st = ['approved', 'partially_received', 'received'] as const
    const rows = await db
      .select({
        po: purchaseOrders,
        vname: vendors.name,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(and(isNull(vendors.deletedAt), inArray(purchaseOrders.status, [...st])))
      .orderBy(desc(purchaseOrders.updatedAt))
      .limit(200)

    const out: PoOption[] = []
    for (const r of rows) {
      const billed = await sumBilledForPo(r.po.id)
      const total = new Decimal(r.po.totalAmount)
      const rem = total.minus(billed)
      if (rem.lte(0)) continue
      out.push({
        id: r.po.id,
        poNo: r.po.poNo,
        vendorName: r.vname,
        status: r.po.status,
        remainingAmountToBill: rem.toNumber(),
      })
    }
    return out
  },

  async getById(id: string): Promise<PoDetail> {
    const row = await db
      .select({
        po: purchaseOrders,
        vname: vendors.name,
        vcode: vendors.code,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.id, id))
      .limit(1)

    const first = row[0]
    if (!first) throw new NotFoundError('purchase order')

    const lines = await db
      .select()
      .from(poItems)
      .where(eq(poItems.poId, id))
      .orderBy(poItems.itemNo)

    const grs = await loadGrsForPo(id)
    const ap = await linkedApBills(id)

    const base: PoDetail = {
      id: first.po.id,
      poNo: first.po.poNo,
      vendorId: first.po.vendorId,
      vendorSummary: { name: first.vname, code: first.vcode },
      issueDate: first.po.issueDate.toISOString().slice(0, 10),
      ...(first.po.expectedDeliveryDate
        ? { expectedDeliveryDate: first.po.expectedDeliveryDate.toISOString().slice(0, 10) }
        : {}),
      status: first.po.status as PoStatus,
      totalAmount: Number(first.po.totalAmount),
      updatedAt: first.po.updatedAt.toISOString(),
      requestedBy: first.po.requestedBy,
      subtotal: Number(first.po.subtotal),
      vatAmount: Number(first.po.vatAmount),
      items: lines.map(mapPoItem),
      goodsReceipts: grs,
      linkedApBills: ap,
      createdAt: first.po.createdAt.toISOString(),
    }
    if (first.po.departmentId) base.departmentId = first.po.departmentId
    if (first.po.projectBudgetId) base.projectBudgetId = first.po.projectBudgetId
    if (first.po.notes) base.notes = first.po.notes
    if (first.po.approvedBy) base.approvedBy = first.po.approvedBy
    if (first.po.approvedAt) base.approvedAt = first.po.approvedAt.toISOString()
    return base
  },

  async create(
    body: {
      vendorId: string
      issueDate: string
      expectedDeliveryDate?: string
      departmentId?: string
      projectBudgetId?: string
      notes?: string
      items: ItemIn[]
    },
    requestedBy: string
  ) {
    const [v] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, body.vendorId), isNull(vendors.deletedAt)))
      .limit(1)
    if (!v) throw new ValidationError({ vendorId: ['ไม่พบผู้ขาย'] })
    if (!v.isActive) throw new ValidationError({ vendorId: ['ผู้ขายถูกปิดการใช้งาน'] })
    if (!body.items?.length) throw new ValidationError({ items: ['ต้องมีอย่างน้อย 1 รายการ'] })

    for (const it of body.items) {
      if (!it.description?.trim()) throw new ValidationError({ items: ['รายการต้องมีคำอธิบาย'] })
      const qty = new Decimal(it.quantity)
      const price = new Decimal(it.unitPrice)
      if (qty.lte(0) || price.lt(0)) throw new ValidationError({ items: ['จำนวนและราคาต้องถูกต้อง'] })
    }

    const issue = new Date(body.issueDate)
    if (Number.isNaN(issue.getTime())) throw new ValidationError({ issueDate: ['วันที่ไม่ถูกต้อง'] })

    const totals = computePoTotals(body.items)
    const poNo = await nextPoNo(issue)

    const [po] = await db
      .insert(purchaseOrders)
      .values({
        poNo,
        vendorId: body.vendorId,
        requestedBy,
        issueDate: issue,
        expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
        departmentId: body.departmentId ?? null,
        projectBudgetId: body.projectBudgetId ?? null,
        status: 'draft',
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        notes: body.notes?.trim() || null,
      })
      .returning()

    if (!po) throw new Error('สร้าง PO ไม่สำเร็จ')

    await db.insert(poItems).values(
      totals.rows.map((r) => ({
        poId: po.id,
        itemNo: r.itemNo,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        unitPrice: r.unitPrice,
        lineTotal: r.lineTotal,
        receivedQty: '0',
      }))
    )

    return PurchaseOrderService.getById(po.id)
  },

  async update(
    id: string,
    body: {
      vendorId?: string
      issueDate?: string
      expectedDeliveryDate?: string
      departmentId?: string
      projectBudgetId?: string
      notes?: string
      items?: ItemIn[]
    }
  ): Promise<PoDetail> {
    const [existing] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
    if (!existing) throw new NotFoundError('purchase order')
    if (existing.status !== 'draft') {
      throw new AppError('PO_NOT_EDITABLE', 'แก้ไขได้เฉพาะสถานะ draft', 400)
    }

    if (body.vendorId) {
      const [v] = await db
        .select()
        .from(vendors)
        .where(and(eq(vendors.id, body.vendorId), isNull(vendors.deletedAt)))
        .limit(1)
      if (!v) throw new ValidationError({ vendorId: ['ไม่พบผู้ขาย'] })
      if (!v.isActive) throw new ValidationError({ vendorId: ['ผู้ขายถูกปิดการใช้งาน'] })
    }

    let totals: ReturnType<typeof computePoTotals> | undefined
    if (body.items) {
      if (!body.items.length) throw new ValidationError({ items: ['ต้องมีอย่างน้อย 1 รายการ'] })
      for (const it of body.items) {
        if (!it.description?.trim()) throw new ValidationError({ items: ['รายการต้องมีคำอธิบาย'] })
        const qty = new Decimal(it.quantity)
        const price = new Decimal(it.unitPrice)
        if (qty.lte(0) || price.lt(0)) throw new ValidationError({ items: ['จำนวนและราคาต้องถูกต้อง'] })
      }
      totals = computePoTotals(body.items)
    }

    await db.transaction(async (tx) => {
      const patch: Partial<typeof purchaseOrders.$inferInsert> = { updatedAt: new Date() }
      if (body.vendorId) patch.vendorId = body.vendorId
      if (body.issueDate) patch.issueDate = new Date(body.issueDate)
      if (body.expectedDeliveryDate !== undefined) {
        patch.expectedDeliveryDate = body.expectedDeliveryDate
          ? new Date(body.expectedDeliveryDate)
          : null
      }
      if (body.departmentId !== undefined) patch.departmentId = body.departmentId || null
      if (body.projectBudgetId !== undefined) patch.projectBudgetId = body.projectBudgetId || null
      if (body.notes !== undefined) patch.notes = body.notes?.trim() || null
      if (totals) {
        patch.subtotal = totals.subtotal
        patch.vatAmount = totals.vatAmount
        patch.totalAmount = totals.totalAmount
      }
      await tx.update(purchaseOrders).set(patch).where(eq(purchaseOrders.id, id))

      if (totals) {
        await tx.delete(poItems).where(eq(poItems.poId, id))
        await tx.insert(poItems).values(
          totals.rows.map((r) => ({
            poId: id,
            itemNo: r.itemNo,
            description: r.description,
            quantity: r.quantity,
            unit: r.unit,
            unitPrice: r.unitPrice,
            lineTotal: r.lineTotal,
            receivedQty: '0',
          }))
        )
      }
    })

    return PurchaseOrderService.getById(id)
  },

  async updateStatus(
    id: string,
    body: { status: 'submitted' | 'approved' | 'cancelled'; reason?: string },
    actorUserId: string
  ): Promise<{ detail: PoDetail; budgetImpact: BudgetImpactStub }> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
    if (!po) throw new NotFoundError('purchase order')

    if (body.status === 'submitted') {
      if (po.status !== 'draft') {
        throw new AppError('PO_INVALID_TRANSITION', 'ส่งได้เฉพาะ draft', 400)
      }
      await db
        .update(purchaseOrders)
        .set({ status: 'submitted', updatedAt: new Date() })
        .where(eq(purchaseOrders.id, id))
    } else if (body.status === 'approved') {
      if (po.status !== 'submitted') {
        throw new AppError('PO_INVALID_TRANSITION', 'อนุมัติได้เฉพาะ submitted', 400)
      }
      await db
        .update(purchaseOrders)
        .set({
          status: 'approved',
          approvedBy: actorUserId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id))
    } else if (body.status === 'cancelled') {
      if (!['draft', 'submitted', 'approved'].includes(po.status)) {
        throw new AppError('PO_INVALID_TRANSITION', 'ยกเลิกไม่ได้ในสถานะนี้', 400)
      }
      const [grc] = await db
        .select({ c: count() })
        .from(goodsReceipts)
        .where(eq(goodsReceipts.poId, id))
      if (Number(grc?.c ?? 0) > 0) {
        throw new AppError('PO_HAS_RECEIPTS', 'ไม่สามารถยกเลิก PO ที่มีใบรับสินค้าแล้ว', 400)
      }
      const cancelNote = body.reason?.trim()
        ? `${po.notes ?? ''}${po.notes ? '\n' : ''}[Cancelled] ${body.reason.trim()}`
        : po.notes
      await db
        .update(purchaseOrders)
        .set({
          status: 'cancelled',
          notes: cancelNote,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id))
    } else {
      throw new ValidationError({ status: ['Invalid status'] })
    }

    const detail = await PurchaseOrderService.getById(id)
    const [p2] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
    return { detail, budgetImpact: stubBudgetImpact(p2!) }
  },

  async listApBills(poId: string): Promise<ApBillLinkApi[]> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1)
    if (!po) throw new NotFoundError('purchase order')
    return linkedApBills(poId)
  },

  async listGoodsReceipts(poId: string): Promise<GoodsReceiptApi[]> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1)
    if (!po) throw new NotFoundError('purchase order')
    return loadGrsForPo(poId)
  },

  async createGoodsReceipt(
    poId: string,
    body: {
      receivedDate: string
      receivedBy: string
      notes?: string
      items: Array<{ poItemId: string; receivedQty: number; notes?: string }>
    }
  ): Promise<GoodsReceiptApi> {
    if (!body.items?.length) throw new ValidationError({ items: ['ต้องมีอย่างน้อย 1 รายการ'] })

    return await db.transaction(async (tx) => {
      const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1)
      if (!po) throw new NotFoundError('purchase order')
      if (!['approved', 'partially_received'].includes(po.status)) {
        throw new AppError('PO_NOT_RECEIVABLE', 'รับสินค้าได้เฉพาะ PO ที่อนุมัติแล้วและยังรับไม่ครบ', 400)
      }

      const rd = new Date(body.receivedDate)
      if (Number.isNaN(rd.getTime())) throw new ValidationError({ receivedDate: ['วันที่ไม่ถูกต้อง'] })

      const grNo = await nextGrNo(rd)

      const [gr] = await tx
        .insert(goodsReceipts)
        .values({
          grNo,
          poId,
          receivedDate: rd,
          receivedBy: body.receivedBy,
          notes: body.notes?.trim() || null,
        })
        .returning()

      if (!gr) throw new Error('สร้าง GR ไม่สำเร็จ')

      for (const line of body.items) {
        const qty = new Decimal(line.receivedQty)
        if (!qty.isFinite() || qty.lte(0)) {
          throw new ValidationError({ items: ['receivedQty ต้องมากกว่า 0'] })
        }
        const [pit] = await tx.select().from(poItems).where(eq(poItems.id, line.poItemId)).limit(1)
        if (!pit || pit.poId !== poId) {
          throw new ValidationError({ items: ['poItemId ไม่ตรงกับ PO'] })
        }
        const max = new Decimal(pit.quantity)
        const prev = new Decimal(pit.receivedQty ?? '0')
        if (prev.plus(qty).gt(max)) {
          throw new ValidationError({
            items: [`รับเกินจำนวนสั่งสำหรับบรรทัด ${pit.itemNo}`],
          })
        }
      }

      for (const line of body.items) {
        await tx.insert(grItems).values({
          grId: gr.id,
          poItemId: line.poItemId,
          receivedQty: String(line.receivedQty),
          notes: line.notes?.trim() || null,
        })
        const [pit] = await tx.select().from(poItems).where(eq(poItems.id, line.poItemId)).limit(1)
        if (!pit) continue
        const prev = new Decimal(pit.receivedQty ?? '0')
        const add = new Decimal(line.receivedQty)
        await tx
          .update(poItems)
          .set({ receivedQty: prev.plus(add).toString() })
          .where(eq(poItems.id, line.poItemId))
      }

      await refreshPoReceivingStatus(tx, poId)

      const lines = await tx.select().from(grItems).where(eq(grItems.grId, gr.id))
      return {
        id: gr.id,
        grNo: gr.grNo,
        receivedDate: gr.receivedDate.toISOString().slice(0, 10),
        receivedBy: gr.receivedBy,
        ...(gr.notes != null && gr.notes !== '' ? { notes: gr.notes } : {}),
        items: lines.map((l) => ({
          poItemId: l.poItemId,
          receivedQty: Number(l.receivedQty),
          ...(l.notes != null && l.notes !== '' ? { notes: l.notes } : {}),
        })),
        createdAt: gr.createdAt.toISOString(),
      }
    })
  },
}
