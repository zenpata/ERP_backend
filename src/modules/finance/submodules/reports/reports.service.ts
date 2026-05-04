import { and, eq, gte, inArray, isNull, lte, notInArray, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { ValidationError } from '../../../../shared/middleware/error.middleware'
import { apBills, chartOfAccounts, customers, invoices, journalEntries, journalLines } from '../../finance.schema'
import { pmExpenses, pmBudgets } from '../../../pm/pm.schema'

export type FinanceSummaryApi = {
  totalAr: number
  totalAp: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  period: string
}

export type ArAgingCustomerLine = {
  customerId: string
  customerCode: string
  customerName: string
  current: string
  days1To30: string
  days31To60: string
  days61To90: string
  daysOver90: string
  total: string
}

export type ArAgingApi = {
  asOf: string
  customers: ArAgingCustomerLine[]
  totals: {
    current: string
    days1To30: string
    days31To60: string
    days61To90: string
    daysOver90: string
    total: string
  }
}

export type PlLine = { accountCode: string; accountName: string; amount: number }

export type ProfitLossApi = {
  period: { dateFrom: string; dateTo: string }
  revenueLines: PlLine[]
  expenseLines: PlLine[]
  totals: { totalRevenue: number; totalExpense: number; netIncome: number }
}

export type BsLine = { accountCode: string; accountName: string; balance: number }

export type BalanceSheetApi = {
  asOf: string
  assets: BsLine[]
  liabilities: BsLine[]
  equity: BsLine[]
  totals: { totalAssets: number; totalLiabilities: number; totalEquity: number }
}

function signedBalanceForBs(accountType: string, debit: Decimal, credit: Decimal): Decimal {
  const t = accountType.toLowerCase()
  if (t === 'asset' || t === 'expense') return debit.minus(credit)
  return credit.minus(debit)
}

function plAmountForType(accountType: string, debit: Decimal, credit: Decimal): Decimal {
  const t = accountType.toLowerCase()
  if (t === 'revenue' || t === 'income') return credit.minus(debit)
  if (t === 'expense' || t === 'cost') return debit.minus(credit)
  return new Decimal(0)
}

export type BudgetVsActualLine = {
  accountCode: string
  accountName: string
  budget: string
  actual: string
  variance: string
  variancePercent: string
  committed: string
}

export type BudgetVsActualApi = {
  projectId: string
  projectName: string
  period: { dateFrom: string; dateTo: string }
  lines: BudgetVsActualLine[]
  totals: {
    totalBudget: string
    totalActual: string
    totalVariance: string
    variancePercent: string
    totalCommitted: string
  }
}

export const ReportsService = {
  async summary(query: { dateFrom?: string; dateTo?: string; period?: string }): Promise<FinanceSummaryApi> {
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined
    const dateTo = query.dateTo ? new Date(query.dateTo + 'T23:59:59') : undefined

    const invRows = await db.select().from(invoices)
    let ar = new Decimal(0)
    let revenue = new Decimal(0)
    for (const inv of invRows) {
      const total = new Decimal(inv.total)
      const paid = new Decimal(inv.paidAmount)
      const open = total.minus(paid)
      if (inv.status !== 'cancelled' && open.gt(0)) {
        ar = ar.plus(open)
      }
      if (inv.status === 'paid' || paid.gt(0)) {
        const inRange =
          (!dateFrom || inv.issueDate >= dateFrom) && (!dateTo || inv.issueDate <= dateTo)
        if (inRange) revenue = revenue.plus(paid.gt(0) ? paid : total)
      }
    }

    const apRows = await db.select().from(apBills)
    let ap = new Decimal(0)
    for (const row of apRows) {
      const total = new Decimal(row.totalAmount)
      const paid = new Decimal(row.paidAmount)
      const open = total.minus(paid)
      if (open.gt(0) && row.status !== 'paid' && row.status !== 'rejected') {
        ap = ap.plus(open)
      }
    }

    const expenseRows = await db
      .select({ amount: pmExpenses.amount })
      .from(pmExpenses)
      .where(inArray(pmExpenses.status, ['Approved', 'Paid']))

    let expenses = new Decimal(0)
    for (const e of expenseRows) {
      expenses = expenses.plus(e.amount)
    }

    const netProfit = revenue.minus(expenses)

    const period =
      query.period ??
      (query.dateFrom && query.dateTo
        ? `${query.dateFrom}–${query.dateTo}`
        : new Date().toISOString().slice(0, 7))

    return {
      totalAr: ar.toNumber(),
      totalAp: ap.toNumber(),
      totalRevenue: revenue.toNumber(),
      totalExpenses: expenses.toNumber(),
      netProfit: netProfit.toNumber(),
      period,
    }
  },

  async arAging(query: { asOf?: string; customerId?: string }): Promise<ArAgingApi> {
    const asOfDay = query.asOf ? new Date(query.asOf) : new Date()
    asOfDay.setHours(0, 0, 0, 0)
    const asOfStr = asOfDay.toISOString().slice(0, 10)

    const filters = [
      isNull(customers.deletedAt),
      notInArray(invoices.status, ['cancelled', 'draft', 'paid']),
      sql`${invoices.total}::numeric > ${invoices.paidAmount}::numeric`,
    ]
    if (query.customerId) filters.push(eq(invoices.customerId, query.customerId))

    const rows = await db
      .select({
        inv: invoices,
        code: customers.code,
        name: customers.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(...filters))

    type Agg = {
      current: Decimal
      d30: Decimal
      d60: Decimal
      d90: Decimal
      d90p: Decimal
      code: string
      name: string
    }
    const byCustomer = new Map<string, Agg>()

    for (const r of rows) {
      const balance = new Decimal(r.inv.total).minus(r.inv.paidAmount)
      if (balance.lte(0)) continue

      const due = new Date(r.inv.dueDate)
      due.setHours(0, 0, 0, 0)

      const cid = r.inv.customerId
      let agg = byCustomer.get(cid)
      if (!agg) {
        agg = {
          current: new Decimal(0),
          d30: new Decimal(0),
          d60: new Decimal(0),
          d90: new Decimal(0),
          d90p: new Decimal(0),
          code: r.code,
          name: r.name,
        }
        byCustomer.set(cid, agg)
      }

      if (due >= asOfDay) {
        agg.current = agg.current.plus(balance)
      } else {
        const days = Math.floor((asOfDay.getTime() - due.getTime()) / 86400000)
        if (days <= 30) agg.d30 = agg.d30.plus(balance)
        else if (days <= 60) agg.d60 = agg.d60.plus(balance)
        else if (days <= 90) agg.d90 = agg.d90.plus(balance)
        else agg.d90p = agg.d90p.plus(balance)
      }
    }

    const customersOut: ArAgingCustomerLine[] = []
    let t0 = new Decimal(0)
    let t30 = new Decimal(0)
    let t60 = new Decimal(0)
    let t90 = new Decimal(0)
    let t90p = new Decimal(0)

    for (const [customerId, agg] of byCustomer) {
      const total = agg.current.plus(agg.d30).plus(agg.d60).plus(agg.d90).plus(agg.d90p)
      t0 = t0.plus(agg.current)
      t30 = t30.plus(agg.d30)
      t60 = t60.plus(agg.d60)
      t90 = t90.plus(agg.d90)
      t90p = t90p.plus(agg.d90p)
      customersOut.push({
        customerId,
        customerCode: agg.code,
        customerName: agg.name,
        current: agg.current.toFixed(2),
        days1To30: agg.d30.toFixed(2),
        days31To60: agg.d60.toFixed(2),
        days61To90: agg.d90.toFixed(2),
        daysOver90: agg.d90p.toFixed(2),
        total: total.toFixed(2),
      })
    }

    customersOut.sort((a, b) => a.customerCode.localeCompare(b.customerCode))
    const grand = t0.plus(t30).plus(t60).plus(t90).plus(t90p)

    return {
      asOf: asOfStr,
      customers: customersOut,
      totals: {
        current: t0.toFixed(2),
        days1To30: t30.toFixed(2),
        days31To60: t60.toFixed(2),
        days61To90: t90.toFixed(2),
        daysOver90: t90p.toFixed(2),
        total: grand.toFixed(2),
      },
    }
  },

  async profitLoss(query: { dateFrom: string; dateTo: string }): Promise<ProfitLossApi> {
    const from = new Date(query.dateFrom)
    const toEnd = new Date(query.dateTo + 'T23:59:59')
    if (Number.isNaN(from.getTime()) || Number.isNaN(toEnd.getTime())) {
      throw new ValidationError({ dateFrom: ['Invalid date range'] })
    }
    if (from > toEnd) throw new ValidationError({ dateFrom: ['dateFrom must be <= dateTo'] })

    const rows = await db
      .select({
        debit: journalLines.debit,
        credit: journalLines.credit,
        accType: chartOfAccounts.type,
        accCode: chartOfAccounts.code,
        accName: chartOfAccounts.name,
        accId: chartOfAccounts.id,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
      .where(and(gte(journalEntries.date, from), lte(journalEntries.date, toEnd)))

    type Agg = { code: string; name: string; type: string; amount: Decimal }
    const byAccount = new Map<string, Agg>()
    for (const r of rows) {
      const id = r.accId
      const delta = plAmountForType(r.accType, new Decimal(r.debit), new Decimal(r.credit))
      if (delta.eq(0)) continue
      let a = byAccount.get(id)
      if (!a) {
        a = { code: r.accCode, name: r.accName, type: r.accType, amount: new Decimal(0) }
        byAccount.set(id, a)
      }
      a.amount = a.amount.plus(delta)
    }

    const revenueLines: PlLine[] = []
    const expenseLines: PlLine[] = []
    let totalRevenue = new Decimal(0)
    let totalExpense = new Decimal(0)
    for (const a of byAccount.values()) {
      const t = a.type.toLowerCase()
      const n = a.amount.toNumber()
      if (t === 'revenue' || t === 'income') {
        if (!a.amount.eq(0)) revenueLines.push({ accountCode: a.code, accountName: a.name, amount: n })
        totalRevenue = totalRevenue.plus(a.amount)
      } else if (t === 'expense' || t === 'cost') {
        if (!a.amount.eq(0)) expenseLines.push({ accountCode: a.code, accountName: a.name, amount: n })
        totalExpense = totalExpense.plus(a.amount)
      }
    }
    revenueLines.sort((x, y) => x.accountCode.localeCompare(y.accountCode))
    expenseLines.sort((x, y) => x.accountCode.localeCompare(y.accountCode))
    const netIncome = totalRevenue.minus(totalExpense)
    return {
      period: { dateFrom: query.dateFrom, dateTo: query.dateTo },
      revenueLines,
      expenseLines,
      totals: {
        totalRevenue: totalRevenue.toNumber(),
        totalExpense: totalExpense.toNumber(),
        netIncome: netIncome.toNumber(),
      },
    }
  },

  async balanceSheet(query: { asOf: string }): Promise<BalanceSheetApi> {
    const asOfEnd = new Date(query.asOf + 'T23:59:59')
    if (Number.isNaN(asOfEnd.getTime())) throw new ValidationError({ asOf: ['Invalid asOf date'] })

    const rows = await db
      .select({
        debit: journalLines.debit,
        credit: journalLines.credit,
        accType: chartOfAccounts.type,
        accCode: chartOfAccounts.code,
        accName: chartOfAccounts.name,
        accId: chartOfAccounts.id,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
      .where(lte(journalEntries.date, asOfEnd))

    const byAccount = new Map<
      string,
      { code: string; name: string; type: string; debit: Decimal; credit: Decimal }
    >()
    for (const r of rows) {
      const id = r.accId
      let a = byAccount.get(id)
      if (!a) {
        a = { code: r.accCode, name: r.accName, type: r.accType, debit: new Decimal(0), credit: new Decimal(0) }
        byAccount.set(id, a)
      }
      a.debit = a.debit.plus(new Decimal(r.debit))
      a.credit = a.credit.plus(new Decimal(r.credit))
    }

    const assets: BsLine[] = []
    const liabilities: BsLine[] = []
    const equity: BsLine[] = []
    let totalAssets = new Decimal(0)
    let totalLiabilities = new Decimal(0)
    let totalEquity = new Decimal(0)
    for (const a of byAccount.values()) {
      const bal = signedBalanceForBs(a.type, a.debit, a.credit)
      if (bal.eq(0)) continue
      const line: BsLine = { accountCode: a.code, accountName: a.name, balance: bal.toNumber() }
      const t = a.type.toLowerCase()
      if (t === 'asset') {
        assets.push(line)
        totalAssets = totalAssets.plus(bal)
      } else if (t === 'liability') {
        liabilities.push(line)
        totalLiabilities = totalLiabilities.plus(bal)
      } else if (t === 'equity') {
        equity.push(line)
        totalEquity = totalEquity.plus(bal)
      }
    }
    const sortFn = (x: BsLine, y: BsLine) => x.accountCode.localeCompare(y.accountCode)
    assets.sort(sortFn)
    liabilities.sort(sortFn)
    equity.sort(sortFn)
    return {
      asOf: query.asOf,
      assets,
      liabilities,
      equity,
      totals: {
        totalAssets: totalAssets.toNumber(),
        totalLiabilities: totalLiabilities.toNumber(),
        totalEquity: totalEquity.toNumber(),
      },
    }
  },

  async budgetVsActual(query: {
    projectId: string
    dateFrom: string
    dateTo: string
  }): Promise<BudgetVsActualApi> {
    const from = new Date(query.dateFrom)
    const toEnd = new Date(query.dateTo + 'T23:59:59')
    if (Number.isNaN(from.getTime()) || Number.isNaN(toEnd.getTime())) {
      throw new ValidationError({ dateFrom: ['Invalid date range'] })
    }
    if (from > toEnd) throw new ValidationError({ dateFrom: ['dateFrom must be <= dateTo'] })

    // Get project budget
    const budgetRow = await db.query.pmBudgets.findFirst({
      where: eq(pmBudgets.id, query.projectId),
    })

    if (!budgetRow) {
      throw new ValidationError({ projectId: ['Project not found'] })
    }

    // Get actual expenses from GL journal entries
    const expenseRows = await db
      .select({
        debit: journalLines.debit,
        credit: journalLines.credit,
        accType: chartOfAccounts.type,
        accCode: chartOfAccounts.code,
        accName: chartOfAccounts.name,
        accId: chartOfAccounts.id,
        projectBudgetId: journalLines.projectBudgetId,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
      .where(
        and(
          eq(journalLines.projectBudgetId, query.projectId),
          gte(journalEntries.date, from),
          lte(journalEntries.date, toEnd),
        ),
      )

    type AccAgg = {
      code: string
      name: string
      type: string
      amount: Decimal
      accId: string
    }
    const byAccount = new Map<string, AccAgg>()
    for (const r of expenseRows) {
      const id = r.accId
      const delta = plAmountForType(r.accType, new Decimal(r.debit), new Decimal(r.credit))
      if (delta.eq(0)) continue
      let a = byAccount.get(id)
      if (!a) {
        a = {
          code: r.accCode,
          name: r.accName,
          type: r.accType,
          amount: new Decimal(0),
          accId: id,
        }
        byAccount.set(id, a)
      }
      a.amount = a.amount.plus(delta)
    }

    // Get committed expenses (approved but not yet posted)
    const fromStr = from.toISOString().split('T')[0] ?? from.toISOString()
    const toEndStr = toEnd.toISOString().split('T')[0] ?? toEnd.toISOString()
    const committedRows = await db
      .select({
        amount: pmExpenses.amount,
        accType: chartOfAccounts.type,
        accCode: chartOfAccounts.code,
        accName: chartOfAccounts.name,
        accId: chartOfAccounts.id,
      })
      .from(pmExpenses)
      .innerJoin(pmBudgets, eq(pmExpenses.budgetId, pmBudgets.id))
      .leftJoin(chartOfAccounts, eq(pmExpenses.expenseAccountId, chartOfAccounts.id))
      .where(
        and(
          eq(pmExpenses.budgetId, query.projectId),
          inArray(pmExpenses.status, ['Approved']),
          gte(pmExpenses.expenseDate, fromStr),
          lte(pmExpenses.expenseDate, toEndStr),
        ),
      )

    type CommittedAgg = {
      code: string
      name: string
      amount: Decimal
      accId: string
    }
    const byAccountCommitted = new Map<string, CommittedAgg>()
    for (const r of committedRows) {
      if (!r.accId) continue
      const id = r.accId
      const existing = byAccountCommitted.get(id)
      const a: CommittedAgg = existing ?? {
        code: r.accCode ?? '',
        name: r.accName ?? '',
        amount: new Decimal(0),
        accId: id,
      }
      if (!existing) byAccountCommitted.set(id, a)
      a.amount = a.amount.plus(new Decimal(r.amount))
    }

    // Build budget allocation by account (simplified: distribute total budget across expense accounts)
    const budgetAmount = new Decimal(budgetRow.totalAmount)
    const totalActual = Array.from(byAccount.values()).reduce(
      (sum, a) => sum.plus(a.type.toLowerCase() === 'expense' ? a.amount : new Decimal(0)),
      new Decimal(0),
    )

    const lines: BudgetVsActualLine[] = []
    let aggTotalBudget = new Decimal(0)
    let aggTotalActual = new Decimal(0)
    let aggTotalCommitted = new Decimal(0)

    for (const a of byAccount.values()) {
      const t = a.type.toLowerCase()
      if (t !== 'expense' && t !== 'cost') continue

      const actualAmount = a.amount
      const committedAmount = byAccountCommitted.get(a.accId)?.amount ?? new Decimal(0)

      // Allocate budget proportionally based on actual spend
      const budgetAlloc = totalActual.gt(0)
        ? budgetAmount.mul(actualAmount).div(totalActual)
        : new Decimal(0)

      const variance = budgetAlloc.minus(actualAmount)
      const variancePercent = budgetAlloc.gt(0)
        ? variance.div(budgetAlloc).mul(100)
        : new Decimal(0)

      aggTotalBudget = aggTotalBudget.plus(budgetAlloc)
      aggTotalActual = aggTotalActual.plus(actualAmount)
      aggTotalCommitted = aggTotalCommitted.plus(committedAmount)

      lines.push({
        accountCode: a.code,
        accountName: a.name,
        budget: budgetAlloc.toFixed(2),
        actual: actualAmount.toFixed(2),
        variance: variance.toFixed(2),
        variancePercent: variancePercent.toFixed(2),
        committed: committedAmount.toFixed(2),
      })
    }

    lines.sort((x, y) => x.accountCode.localeCompare(y.accountCode))

    const totalVariance = aggTotalBudget.minus(aggTotalActual)
    const totalVariancePercent = aggTotalBudget.gt(0)
      ? totalVariance.div(aggTotalBudget).mul(100)
      : new Decimal(0)

    return {
      projectId: query.projectId,
      projectName: budgetRow.projectName,
      period: { dateFrom: query.dateFrom, dateTo: query.dateTo },
      lines,
      totals: {
        totalBudget: aggTotalBudget.toFixed(2),
        totalActual: aggTotalActual.toFixed(2),
        totalVariance: totalVariance.toFixed(2),
        variancePercent: totalVariancePercent.toFixed(2),
        totalCommitted: aggTotalCommitted.toFixed(2),
      },
    }
  },
}
