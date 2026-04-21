import { and, count, desc, eq, ilike, inArray, isNull, lt, notInArray, or, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, ConflictError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { customers, invoices } from '../../finance.schema'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

const CUSTOMER_CODE_RE = /^C-\d{4}$/

function normalizeCustomerCode(code: string): string {
  return code.trim().toUpperCase()
}

function assertTaxId(taxId: string | undefined): void {
  if (taxId === undefined || taxId === '') return
  if (!/^\d{13}$/.test(taxId)) {
    throw new ValidationError({ taxId: ['Must be 13 digits'] })
  }
}

function assertEmail(email: string | undefined): void {
  if (email === undefined || email === '') return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError({ email: ['รูปแบบอีเมลไม่ถูกต้อง'] })
  }
}

async function nextCustomerCode(tx: DbTransaction): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(881002)`)
  const rows = await tx.select({ code: customers.code }).from(customers)
  let max = 0
  for (const r of rows) {
    const m = /^C-(\d{4})$/.exec(normalizeCustomerCode(r.code))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `C-${String(max + 1).padStart(4, '0')}`
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const openInvoiceStatuses = ['issued', 'partially_paid', 'overdue'] as const

function mapMaster(c: typeof customers.$inferSelect) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    taxId: c.taxId ?? undefined,
    address: c.address ?? undefined,
    phone: c.phone ?? undefined,
    email: c.email ?? undefined,
    contactName: c.contactName ?? undefined,
    creditLimit: String(c.creditLimit),
    creditTermDays: c.creditTermDays,
    notes: c.notes ?? undefined,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    deletedAt: c.deletedAt ? c.deletedAt.toISOString() : undefined,
  }
}

async function customerIdsWithOverdue(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const rows = await db
    .select({ customerId: invoices.customerId })
    .from(invoices)
    .where(
      and(
        inArray(invoices.customerId, ids),
        lt(invoices.dueDate, startOfToday()),
        notInArray(invoices.status, ['paid', 'cancelled', 'draft']),
        sql`${invoices.total}::numeric > ${invoices.paidAmount}::numeric`
      )!
    )
    .groupBy(invoices.customerId)
  return new Set(rows.map((r) => r.customerId))
}

async function computeArForCustomer(customerId: string) {
  const invs = await db.select().from(invoices).where(eq(invoices.customerId, customerId))

  let currentAR = new Decimal(0)
  let overdueAmount = new Decimal(0)
  let overdueInvoiceCount = 0
  let lastInvoiceDate: Date | null = null

  const today = startOfToday()

  for (const inv of invs) {
    if (!lastInvoiceDate || inv.issueDate > lastInvoiceDate) {
      lastInvoiceDate = inv.issueDate
    }
    if (inv.status === 'cancelled' || inv.status === 'draft') continue

    const total = new Decimal(inv.total)
    const paid = new Decimal(inv.paidAmount)
    const bal = total.minus(paid)
    if (bal.lte(0)) continue

    if (openInvoiceStatuses.includes(inv.status as (typeof openInvoiceStatuses)[number])) {
      currentAR = currentAR.plus(bal)
    }

    const due = new Date(inv.dueDate)
    due.setHours(0, 0, 0, 0)
    if (due < today) {
      overdueAmount = overdueAmount.plus(bal)
      overdueInvoiceCount += 1
    }
  }

  return {
    currentAR: currentAR.toFixed(2),
    overdueAmount: overdueAmount.toFixed(2),
    overdueInvoiceCount,
    lastInvoiceDate: lastInvoiceDate ? lastInvoiceDate.toISOString().slice(0, 10) : null,
  }
}

async function invoiceHistorySummary(customerId: string) {
  const invs = await db.select().from(invoices).where(eq(invoices.customerId, customerId))
  let openCount = 0
  let paidCount = 0
  let cancelledCount = 0
  for (const inv of invs) {
    if (inv.status === 'paid') paidCount += 1
    else if (inv.status === 'cancelled') cancelledCount += 1
    else if (inv.status !== 'draft') {
      const bal = new Decimal(inv.total).minus(inv.paidAmount)
      if (bal.gt(0)) openCount += 1
    }
  }
  const sorted = [...invs].sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime())
  const last = sorted[0]
  return {
    totalInvoiceCount: invs.length,
    openInvoiceCount: openCount,
    paidInvoiceCount: paidCount,
    cancelledInvoiceCount: cancelledCount,
    lastInvoiceNumber: last?.invoiceNumber ?? null,
    lastIssueDate: last ? last.issueDate.toISOString().slice(0, 10) : null,
  }
}

export type CustomerListItem = ReturnType<typeof mapMaster> & { hasOverdueInvoice: boolean }

export type CustomerDetail = ReturnType<typeof mapMaster> & {
  arSummary: Awaited<ReturnType<typeof computeArForCustomer>>
  invoiceHistorySummary: Awaited<ReturnType<typeof invoiceHistorySummary>>
}

export const CustomerService = {
  async list(query: {
    search?: string
    page?: number
    perPage?: number
    limit?: number
    isActive?: boolean
  }): Promise<PaginatedResult<CustomerListItem>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? query.limit ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = [isNull(customers.deletedAt)]
    if (query.isActive !== undefined) {
      conditions.push(eq(customers.isActive, query.isActive))
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`
      conditions.push(
        or(
          ilike(customers.name, term),
          ilike(customers.code, term),
          ilike(customers.taxId, term)
        )!
      )
    }
    const whereClause = and(...conditions)

    const [countRow] = await db.select({ c: count() }).from(customers).where(whereClause)
    const total = Number(countRow?.c ?? 0)

    const rows = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(perPage)
      .offset(offset)

    const ids = rows.map((r) => r.id)
    const overdueSet = await customerIdsWithOverdue(ids)

    return {
      data: rows.map((c) => ({
        ...mapMaster(c),
        hasOverdueInvoice: overdueSet.has(c.id),
      })),
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  },

  async options(query: { search?: string; activeOnly?: boolean }) {
    const conditions = [isNull(customers.deletedAt)]
    if (query.activeOnly !== false) {
      conditions.push(eq(customers.isActive, true))
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`
      conditions.push(
        or(ilike(customers.name, term), ilike(customers.code, term), ilike(customers.taxId, term))!
      )
    }
    const rows = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(customers.name)
      .limit(100)

    const ids = rows.map((r) => r.id)
    const overdueSet = await customerIdsWithOverdue(ids)

    let openArByCustomer = new Map<string, Decimal>()
    if (ids.length > 0) {
      const agg = await db
        .select({
          customerId: invoices.customerId,
          openTotal: sql<string>`coalesce(sum(${invoices.total}::numeric - ${invoices.paidAmount}::numeric), 0)`,
        })
        .from(invoices)
        .where(
          and(
            inArray(invoices.customerId, ids),
            notInArray(invoices.status, ['paid', 'cancelled', 'draft']),
            sql`${invoices.total}::numeric > ${invoices.paidAmount}::numeric`
          )!
        )
        .groupBy(invoices.customerId)
      openArByCustomer = new Map(
        agg.map((r) => [r.customerId, new Decimal(r.openTotal ?? '0')])
      )
    }

    return rows.map((c) => {
      const creditLimit = new Decimal(c.creditLimit)
      const openAr = openArByCustomer.get(c.id) ?? new Decimal(0)
      const creditWarning = openAr.gt(creditLimit) ? 'over_credit_limit' : undefined

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        taxId: c.taxId ?? undefined,
        isActive: c.isActive,
        hasOverdueInvoice: overdueSet.has(c.id),
        ...(creditWarning ? { creditWarning } : {}),
      }
    })
  },

  async getById(id: string): Promise<CustomerDetail> {
    const c = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    })
    if (!c) throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found', 404)

    const [arSummary, hist] = await Promise.all([
      computeArForCustomer(id),
      invoiceHistorySummary(id),
    ])

    return {
      ...mapMaster(c),
      arSummary,
      invoiceHistorySummary: hist,
    }
  },

  async create(body: {
    code?: string
    name: string
    taxId?: string
    address?: string
    contactName?: string
    phone?: string
    email?: string
    creditLimit?: string
    creditTermDays?: number
    notes?: string
  }) {
    if (!body.name?.trim()) {
      throw new ValidationError({ name: ['กรุณากรอกชื่อลูกค้า'] })
    }
    assertTaxId(body.taxId)
    assertEmail(body.email)

    const creditTermDays = body.creditTermDays ?? 30
    if (!Number.isInteger(creditTermDays) || creditTermDays < 0) {
      throw new ValidationError({ creditTermDays: ['Must be a non-negative integer'] })
    }

    const creditLimit = body.creditLimit?.trim() ? body.creditLimit.trim() : '0'
    if (new Decimal(creditLimit).lt(0)) {
      throw new ValidationError({ creditLimit: ['Must be >= 0'] })
    }

    return await db.transaction(async (tx) => {
      let code: string
      if (body.code?.trim()) {
        code = normalizeCustomerCode(body.code)
        if (!CUSTOMER_CODE_RE.test(code)) {
          throw new ValidationError({ code: ['รูปแบบต้องเป็น C-0000'] })
        }
      } else {
        code = await nextCustomerCode(tx)
      }

      const taxId = body.taxId?.trim() || null
      if (taxId) {
        const dup = await tx.query.customers.findFirst({
          where: and(eq(customers.taxId, taxId), isNull(customers.deletedAt)),
        })
        if (dup) {
          throw new ConflictError('CUSTOMER_TAX_ID_DUPLICATE', 'Tax ID already exists', {
            taxId: 'Duplicate tax ID',
          })
        }
      }

      const dupCode = await tx.query.customers.findFirst({
        where: and(eq(customers.code, code), isNull(customers.deletedAt)),
      })
      if (dupCode) {
        throw new ConflictError('CUSTOMER_CODE_DUPLICATE', 'Code already exists', {
          code: 'Duplicate code',
        })
      }

      const [row] = await tx
        .insert(customers)
        .values({
          code,
          name: body.name.trim(),
          taxId,
          address: body.address?.trim() || null,
          contactName: body.contactName?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
          creditLimit,
          creditTermDays,
          notes: body.notes?.trim() || null,
          isActive: true,
          deletedAt: null,
        })
        .returning()

      if (!row) throw new Error('create customer failed')
      return this.getById(row.id)
    })
  },

  async update(
    id: string,
    body: {
      name?: string
      taxId?: string | null
      address?: string | null
      contactName?: string | null
      phone?: string | null
      email?: string | null
      creditLimit?: string | null
      creditTermDays?: number
      notes?: string | null
    }
  ) {
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), isNull(customers.deletedAt)),
    })
    if (!existing) throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found', 404)

    if (body.taxId !== undefined && body.taxId !== null && body.taxId !== '') {
      assertTaxId(body.taxId)
      const tid = body.taxId.trim()
      const dup = await db.query.customers.findFirst({
        where: and(eq(customers.taxId, tid), isNull(customers.deletedAt)),
      })
      if (dup && dup.id !== id) {
        throw new ConflictError('CUSTOMER_TAX_ID_DUPLICATE', 'Tax ID already exists', {
          taxId: 'Duplicate tax ID',
        })
      }
    }
    if (body.email !== undefined && body.email !== null) assertEmail(body.email || undefined)
    if (body.creditTermDays !== undefined) {
      if (!Number.isInteger(body.creditTermDays) || body.creditTermDays < 0) {
        throw new ValidationError({ creditTermDays: ['Must be a non-negative integer'] })
      }
    }
    if (body.creditLimit !== undefined && body.creditLimit !== null && body.creditLimit !== '') {
      if (new Decimal(body.creditLimit).lt(0)) {
        throw new ValidationError({ creditLimit: ['Must be >= 0'] })
      }
    }

    const patch: Partial<typeof customers.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (body.name !== undefined) {
      if (!body.name.trim()) throw new ValidationError({ name: ['กรุณากรอกชื่อลูกค้า'] })
      patch.name = body.name.trim()
    }
    if (body.taxId !== undefined) patch.taxId = body.taxId?.trim() || null
    if (body.address !== undefined) patch.address = body.address?.trim() || null
    if (body.phone !== undefined) patch.phone = body.phone?.trim() || null
    if (body.email !== undefined) patch.email = body.email?.trim() || null
    if (body.contactName !== undefined) patch.contactName = body.contactName?.trim() || null
    if (body.creditLimit !== undefined) patch.creditLimit = body.creditLimit?.trim() || '0'
    if (body.creditTermDays !== undefined) patch.creditTermDays = body.creditTermDays
    if (body.notes !== undefined) patch.notes = body.notes?.trim() || null

    await db.update(customers).set(patch).where(eq(customers.id, id))
    return this.getById(id)
  },

  async activate(id: string, isActive: boolean) {
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), isNull(customers.deletedAt)),
    })
    if (!existing) throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found', 404)

    await db
      .update(customers)
      .set({
        isActive,
        updatedAt: new Date(),
        ...(isActive ? { deletedAt: null } : {}),
      })
      .where(eq(customers.id, id))

    const row = await db.query.customers.findFirst({
      where: eq(customers.id, id),
    })
    return {
      id,
      isActive,
      updatedAt: row?.updatedAt.toISOString() ?? new Date().toISOString(),
    }
  },

  async remove(id: string) {
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), isNull(customers.deletedAt)),
    })
    if (!existing) throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found', 404)

    const openInv = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, id),
          notInArray(invoices.status, ['paid', 'cancelled', 'draft'])
        )
      )

    let unpaidCount = 0
    let outstanding = new Decimal(0)
    for (const inv of openInv) {
      const bal = new Decimal(inv.total).minus(inv.paidAmount)
      if (bal.gt(0)) {
        unpaidCount += 1
        outstanding = outstanding.plus(bal)
      }
    }

    if (unpaidCount > 0) {
      throw new ConflictError(
        'CUSTOMER_HAS_UNPAID_INVOICES',
        'Cannot delete customer with unpaid invoices',
        undefined,
        {
          unpaidInvoiceCount: unpaidCount,
          outstandingAmount: outstanding.toFixed(2),
        }
      )
    }

    await db
      .update(customers)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(eq(customers.id, id))
    return { success: true as const }
  },
}
