import { and, asc, count, desc, eq, gte, ilike, lte } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { employees } from '../../../hr/hr.schema'
import { assertBudgetActive, validateExpenseAgainstBudget } from '../budget/budget.service'
import { pmBudgets, pmExpenses } from '../../pm.schema'

export type ExpenseListItem = {
  id: string
  title: string
  budgetId: string
  amount: string
  expenseDate: string
  category: string
  paymentMethod: string
  status: string
  requestedByName: string
}

function mapRow(
  row: typeof pmExpenses.$inferSelect,
  requestedByName: string
): ExpenseListItem {
  return {
    id: row.id,
    title: row.title,
    budgetId: row.budgetId,
    amount: String(row.amount),
    expenseDate: String(row.expenseDate),
    category: row.category,
    paymentMethod: row.paymentMethod,
    status: row.status,
    requestedByName,
  }
}

const EXPENSE_SORT_FIELDS = {
  expense_date: pmExpenses.expenseDate,
  amount: pmExpenses.amount,
  title: pmExpenses.title,
  category: pmExpenses.category,
  status: pmExpenses.status,
} as const

type ExpenseSortKey = keyof typeof EXPENSE_SORT_FIELDS

function expenseOrderClause(sortBy?: string, sortDirection?: string) {
  const key = (sortBy ?? 'expense_date') as string
  const col =
    key in EXPENSE_SORT_FIELDS
      ? EXPENSE_SORT_FIELDS[key as ExpenseSortKey]
      : EXPENSE_SORT_FIELDS.expense_date
  return sortDirection === 'asc' ? asc(col) : desc(col)
}

async function nextExpenseCode(): Promise<string> {
  const [r] = await db.select({ count: count() }).from(pmExpenses)
  const n = Number(r?.count ?? 0) + 1
  return `EXP-${String(n).padStart(3, '0')}`
}

export const ExpenseService = {
  async list(query: {
    page?: number
    perPage?: number
    status?: string
    category?: string
    budgetId?: string
    startDate?: string
    endDate?: string
    search?: string
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
  }): Promise<PaginatedResult<ExpenseListItem>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage
    const conditions = []
    if (query.status) conditions.push(eq(pmExpenses.status, query.status))
    if (query.category) conditions.push(eq(pmExpenses.category, query.category))
    if (query.budgetId) conditions.push(eq(pmExpenses.budgetId, query.budgetId))
    if (query.startDate) conditions.push(gte(pmExpenses.expenseDate, query.startDate))
    if (query.endDate) conditions.push(lte(pmExpenses.expenseDate, query.endDate))
    if (query.search) {
      conditions.push(ilike(pmExpenses.title, `%${query.search}%`))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const allowedSort = query.sortBy == null || query.sortBy in EXPENSE_SORT_FIELDS
    const sortBy = allowedSort ? query.sortBy : 'expense_date'
    const sortDirection =
      query.sortDirection === 'asc' || query.sortDirection === 'desc'
        ? query.sortDirection
        : 'desc'

    const base = db
      .select({
        expense: pmExpenses,
        fn: employees.firstnameTh,
        ln: employees.lastnameTh,
      })
      .from(pmExpenses)
      .leftJoin(employees, eq(pmExpenses.requestedByEmployeeId, employees.id))
      .where(where)
      .orderBy(expenseOrderClause(sortBy, sortDirection))

    const [rows, totalResult] = await Promise.all([
      base.limit(perPage).offset(offset),
      db.select({ count: count() }).from(pmExpenses).where(where),
    ])
    const total = Number(totalResult[0]?.count ?? 0)

    const data = rows.map((r) =>
      mapRow(
        r.expense,
        r.fn && r.ln ? `${r.fn} ${r.ln}`.trim() : '-'
      )
    )

    return {
      data,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    }
  },

  async getById(id: string): Promise<ExpenseListItem> {
    const [row] = await db
      .select({
        expense: pmExpenses,
        fn: employees.firstnameTh,
        ln: employees.lastnameTh,
      })
      .from(pmExpenses)
      .leftJoin(employees, eq(pmExpenses.requestedByEmployeeId, employees.id))
      .where(eq(pmExpenses.id, id))
      .limit(1)
    if (!row) throw new NotFoundError('expense')
    return mapRow(
      row.expense,
      row.fn && row.ln ? `${row.fn} ${row.ln}`.trim() : '-'
    )
  },

  async create(body: {
    title: string
    budgetId: string
    amount: string
    expenseDate: string
    category: string
    paymentMethod: string
    requestedByEmployeeId?: string
  }): Promise<ExpenseListItem> {
    await assertBudgetActive(body.budgetId)
    const amt = new Decimal(body.amount)
    await validateExpenseAgainstBudget(body.budgetId, amt)
    const code = await nextExpenseCode()
    const [created] = await db
      .insert(pmExpenses)
      .values({
        expenseCode: code,
        title: body.title,
        budgetId: body.budgetId,
        amount: body.amount,
        expenseDate: body.expenseDate,
        category: body.category,
        paymentMethod: body.paymentMethod,
        status: 'Draft',
        requestedByEmployeeId: body.requestedByEmployeeId ?? null,
      })
      .returning()
    if (!created) throw new ValidationError({ expense: ['สร้างรายการไม่สำเร็จ'] })
    return ExpenseService.getById(created.id)
  },

  async update(
    id: string,
    body: Partial<{
      title: string
      amount: string
      expenseDate: string
      category: string
      paymentMethod: string
    }>
  ): Promise<ExpenseListItem> {
    const row = await db.query.pmExpenses.findFirst({ where: eq(pmExpenses.id, id) })
    if (!row) throw new NotFoundError('expense')
    if (row.status !== 'Draft') {
      throw new ValidationError({ status: ['แก้ไขได้เฉพาะ Draft'] })
    }
    const newAmount = body.amount != null ? new Decimal(body.amount) : new Decimal(String(row.amount))
    await validateExpenseAgainstBudget(row.budgetId, newAmount, id)
    const [updated] = await db
      .update(pmExpenses)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(pmExpenses.id, id))
      .returning()
    if (!updated) throw new NotFoundError('expense')
    return ExpenseService.getById(id)
  },

  async remove(id: string): Promise<void> {
    const row = await db.query.pmExpenses.findFirst({ where: eq(pmExpenses.id, id) })
    if (!row) throw new NotFoundError('expense')
    if (row.status !== 'Draft' && row.status !== 'Rejected') {
      throw new ValidationError({ status: ['ลบได้เฉพาะ Draft หรือ Rejected'] })
    }
    await db.delete(pmExpenses).where(eq(pmExpenses.id, id))
  },

  async patchStatus(
    id: string,
    body: { status: string; approvedBy?: string; note?: string }
  ): Promise<ExpenseListItem> {
    const row = await db.query.pmExpenses.findFirst({ where: eq(pmExpenses.id, id) })
    if (!row) throw new NotFoundError('expense')
    const { status } = body
    const cur = row.status
    if (status === 'Pending Approval' && cur === 'Draft') {
      await assertBudgetActive(row.budgetId)
      await validateExpenseAgainstBudget(row.budgetId, new Decimal(String(row.amount)), id)
    }
    const needsApprover =
      (cur === 'Pending Approval' && (status === 'Approved' || status === 'Rejected')) ||
      (cur === 'Approved' && status === 'Paid')
    if (needsApprover && !body.approvedBy) {
      throw new ValidationError({ approvedBy: ['ต้องระบุผู้อนุมัติ'] })
    }
    if (cur === 'Draft' && status === 'Pending Approval') {
      await db
        .update(pmExpenses)
        .set({
          status,
          note: body.note ?? row.note,
          updatedAt: new Date(),
        })
        .where(eq(pmExpenses.id, id))
    } else if (cur === 'Pending Approval' && (status === 'Approved' || status === 'Rejected')) {
      await db
        .update(pmExpenses)
        .set({
          status,
          approvedByUserId: body.approvedBy ?? null,
          note: body.note ?? row.note,
          updatedAt: new Date(),
        })
        .where(eq(pmExpenses.id, id))
    } else if (cur === 'Approved' && status === 'Paid') {
      await db
        .update(pmExpenses)
        .set({
          status: 'Paid',
          approvedByUserId: body.approvedBy ?? row.approvedByUserId,
          note: body.note ?? row.note,
          updatedAt: new Date(),
        })
        .where(eq(pmExpenses.id, id))
    } else if (cur === 'Rejected' && status === 'Draft') {
      await db
        .update(pmExpenses)
        .set({
          status: 'Draft',
          note: body.note ?? row.note,
          updatedAt: new Date(),
        })
        .where(eq(pmExpenses.id, id))
    } else {
      throw new ValidationError({ status: ['การเปลี่ยนสถานะไม่ถูกต้อง'] })
    }
    return ExpenseService.getById(id)
  },
}
