import { and, count, eq, ilike, inArray, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { pmBudgets, pmExpenses } from '../../pm.schema'

const EDITABLE_STATUSES = ['Draft', 'On Hold'] as const
const ACTIVE = 'Active'

export type BudgetRow = typeof pmBudgets.$inferSelect

export type BudgetListItem = {
  id: string
  budgetCode: string
  projectName: string
  totalAmount: string
  budgetType: string
  moduleTags: string[]
  ownerName: string
  status: string
  startDate: string
  endDate: string
  spentAmount?: string
}

export type BudgetSummary = {
  totalBudget: number
  spent: number
  remaining: number
  utilizationPct: number
  byCategory: { category: string; spent: number }[]
}

function rowToListItem(row: BudgetRow, spent?: string): BudgetListItem {
  return {
    id: row.id,
    budgetCode: row.budgetCode,
    projectName: row.projectName,
    totalAmount: String(row.totalAmount),
    budgetType: row.budgetType,
    moduleTags: (row.moduleTags as string[]) ?? [],
    ownerName: row.ownerName,
    status: row.status,
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    ...(spent !== undefined ? { spentAmount: spent } : {}),
  }
}

async function nextBudgetCode(): Promise<string> {
  const [r] = await db.select({ count: count() }).from(pmBudgets)
  const n = Number(r?.count ?? 0) + 1
  return `BDG-${String(n).padStart(3, '0')}`
}

async function spentForBudget(budgetId: string): Promise<Decimal> {
  const rows = await db
    .select({ amount: pmExpenses.amount })
    .from(pmExpenses)
    .where(
      and(eq(pmExpenses.budgetId, budgetId), inArray(pmExpenses.status, ['Approved', 'Paid']))
    )
  return rows.reduce((acc, r) => acc.plus(new Decimal(String(r.amount))), new Decimal(0))
}

export const BudgetService = {
  async list(query: {
    page?: number
    perPage?: number
    status?: string
    module?: string
    search?: string
  }): Promise<PaginatedResult<BudgetListItem>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage
    const conditions = []
    if (query.status) conditions.push(eq(pmBudgets.status, query.status))
    if (query.search) {
      conditions.push(ilike(pmBudgets.projectName, `%${query.search}%`))
    }
    if (query.module) {
      conditions.push(
        sql`${pmBudgets.moduleTags}::jsonb @> ${JSON.stringify([query.module])}::jsonb`
      )
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, totalResult] = await Promise.all([
      db.select().from(pmBudgets).where(where).limit(perPage).offset(offset),
      db.select({ count: count() }).from(pmBudgets).where(where),
    ])
    const total = Number(totalResult[0]?.count ?? 0)

    const items: BudgetListItem[] = []
    for (const row of rows) {
      const spent = await spentForBudget(row.id)
      items.push(rowToListItem(row as BudgetRow, spent.toFixed(2)))
    }

    return {
      data: items,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    }
  },

  async getById(id: string): Promise<BudgetListItem> {
    const row = await db.query.pmBudgets.findFirst({
      where: eq(pmBudgets.id, id),
    })
    if (!row) throw new NotFoundError('budget')
    const spent = await spentForBudget(id)
    return rowToListItem(row as BudgetRow, spent.toFixed(2))
  },

  async summary(id: string): Promise<BudgetSummary> {
    const row = await db.query.pmBudgets.findFirst({
      where: eq(pmBudgets.id, id),
    })
    if (!row) throw new NotFoundError('budget')
    const totalBudget = new Decimal(String(row.totalAmount))
    const spent = await spentForBudget(id)
    const remaining = totalBudget.minus(spent)
    const utilizationPct = totalBudget.gt(0)
      ? spent.div(totalBudget).times(100).toDecimalPlaces(0).toNumber()
      : 0

    const catRows = await db
      .select({
        category: pmExpenses.category,
        sum: sql<string>`coalesce(sum(${pmExpenses.amount}::numeric), 0)`,
      })
      .from(pmExpenses)
      .where(
        and(eq(pmExpenses.budgetId, id), inArray(pmExpenses.status, ['Approved', 'Paid']))
      )
      .groupBy(pmExpenses.category)

    return {
      totalBudget: totalBudget.toNumber(),
      spent: spent.toNumber(),
      remaining: remaining.toNumber(),
      utilizationPct,
      byCategory: catRows.map((c) => ({
        category: c.category,
        spent: Number(c.sum),
      })),
    }
  },

  async create(body: {
    projectName: string
    totalAmount: string
    budgetType: string
    moduleTags: string[]
    ownerName: string
    startDate: string
    endDate: string
  }): Promise<BudgetListItem> {
    const code = await nextBudgetCode()
    const [created] = await db
      .insert(pmBudgets)
      .values({
        budgetCode: code,
        projectName: body.projectName,
        totalAmount: body.totalAmount,
        budgetType: body.budgetType,
        moduleTags: body.moduleTags,
        ownerName: body.ownerName,
        status: 'Draft',
        startDate: body.startDate,
        endDate: body.endDate,
      })
      .returning()
    if (!created) throw new ValidationError({ budget: ['สร้างงบไม่สำเร็จ'] })
    return rowToListItem(created as BudgetRow, '0')
  },

  async update(
    id: string,
    body: Partial<{
      projectName: string
      totalAmount: string
      budgetType: string
      moduleTags: string[]
      ownerName: string
      startDate: string
      endDate: string
    }>
  ): Promise<BudgetListItem> {
    const row = await db.query.pmBudgets.findFirst({ where: eq(pmBudgets.id, id) })
    if (!row) throw new NotFoundError('budget')
    if (!EDITABLE_STATUSES.includes(row.status as (typeof EDITABLE_STATUSES)[number])) {
      throw new ValidationError({ status: ['แก้ไขได้เฉพาะสถานะ Draft หรือ On Hold'] })
    }
    const [updated] = await db
      .update(pmBudgets)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(pmBudgets.id, id))
      .returning()
    if (!updated) throw new NotFoundError('budget')
    const spent = await spentForBudget(id)
    return rowToListItem(updated as BudgetRow, spent.toFixed(2))
  },

  async remove(id: string): Promise<void> {
    const row = await db.query.pmBudgets.findFirst({ where: eq(pmBudgets.id, id) })
    if (!row) throw new NotFoundError('budget')
    if (row.status !== 'Draft') {
      throw new ValidationError({ status: ['ลบได้เฉพาะงบที่เป็น Draft'] })
    }
    await db.delete(pmBudgets).where(eq(pmBudgets.id, id))
  },

  async patchStatus(id: string, status: string, _note?: string): Promise<BudgetListItem> {
    const row = await db.query.pmBudgets.findFirst({ where: eq(pmBudgets.id, id) })
    if (!row) throw new NotFoundError('budget')
    const cur = row.status
    const allowed: Record<string, string[]> = {
      Draft: ['Approved', 'Closed'],
      Approved: ['Active', 'Closed'],
      Active: ['On Hold', 'Closed'],
      'On Hold': ['Active', 'Closed'],
      Closed: [],
    }
    const nextOk = allowed[cur] ?? []
    if (!nextOk.includes(status)) {
      throw new ValidationError({ status: ['การเปลี่ยนสถานะไม่ถูกต้อง'] })
    }
    const [updated] = await db
      .update(pmBudgets)
      .set({ status, updatedAt: new Date() })
      .where(eq(pmBudgets.id, id))
      .returning()
    if (!updated) throw new NotFoundError('budget')
    const spent = await spentForBudget(id)
    return rowToListItem(updated as BudgetRow, spent.toFixed(2))
  },

}

export async function assertBudgetActive(budgetId: string): Promise<BudgetRow> {
  const row = await db.query.pmBudgets.findFirst({ where: eq(pmBudgets.id, budgetId) })
  if (!row) throw new NotFoundError('budget')
  if (row.status !== ACTIVE) {
    throw new ValidationError({ budget: ['บันทึกค่าใช้จ่ายได้เมื่องบมีสถานะ Active เท่านั้น'] })
  }
  return row as BudgetRow
}

export async function validateExpenseAgainstBudget(
  budgetId: string,
  newAmount: Decimal,
  excludeExpenseId?: string
): Promise<void> {
  const budget = await db.query.pmBudgets.findFirst({ where: eq(pmBudgets.id, budgetId) })
  if (!budget) throw new NotFoundError('budget')
  const total = new Decimal(String(budget.totalAmount))
  const rows = await db
    .select({ amount: pmExpenses.amount })
    .from(pmExpenses)
    .where(
      and(eq(pmExpenses.budgetId, budgetId), inArray(pmExpenses.status, ['Approved', 'Paid']))
    )
  let used = rows.reduce((a, r) => a.plus(new Decimal(String(r.amount))), new Decimal(0))
  if (excludeExpenseId) {
    const ex = await db.query.pmExpenses.findFirst({ where: eq(pmExpenses.id, excludeExpenseId) })
    if (ex && (ex.status === 'Approved' || ex.status === 'Paid')) {
      used = used.minus(new Decimal(String(ex.amount)))
    }
  }
  if (used.plus(newAmount).gt(total)) {
    throw new AppError('BUDGET_EXCEEDED', 'ยอดใช้จ่ายเกินงบประมาณ', 422)
  }
}
