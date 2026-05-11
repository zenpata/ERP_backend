import { and, asc, count, eq, isNull, notInArray, sql } from 'drizzle-orm'
import { db } from '../../shared/db/client'
import { isEnabled } from '../../shared/config/features'
import { apBills, bankAccounts, invoices } from '../finance/finance.schema'
import { employees, leaveRequests, overtimeRequests, payrollRuns } from '../hr/hr.schema'
import { pmBudgets, pmExpenses, pmProgressTasks } from '../pm/pm.schema'

const FINANCE_ACCESS = new Set([
  'finance:invoice:view',
  'finance:report:view',
  'finance:ap:view',
  'finance:customer:view',
  'finance:bank_account:view',
])

const HR_ACCESS = new Set([
  'hr:employee:view',
  'hr:leave:view',
  'hr:leave:approve',
  'hr:payroll:view',
  'hr:payroll:run',
  'hr:attendance:view',
  'hr:overtime:view',
  'hr:overtime:approve',
])

const PM_ACCESS = new Set([
  'pm:dashboard:view',
  'pm:budget:view',
  'pm:expense:view',
  'pm:progress:view',
])

export type DashboardSummaryResponse = {
  finance?: {
    revenueThisMonth: number
    revenueYTD: number
    expenseThisMonth: number
    arOutstanding: number
    apOverdueCount: number
    netProfitThisMonth: number
    cashBalance?: number
  }
  hr?: {
    totalHeadcount: number
    pendingLeaveRequests: number
    nextPayrollDate: string | null
    pendingOTApprovals: number
  }
  pm?: {
    activeBudgets: number
    tasksInProgress: number
    tasksOverdue: number
    avgBudgetUtilization: number
  }
  alerts: { type: string; count: number; url: string }[]
  meta: {
    asOf: string
    freshnessSeconds: number
    permissionTrimmedModules: ('finance' | 'hr' | 'pm')[]
    widgetVisibilityMode: 'omit_widget'
  }
}

function hasModuleAccess(codes: Set<string>, module: 'finance' | 'hr' | 'pm'): boolean {
  const set = module === 'finance' ? FINANCE_ACCESS : module === 'hr' ? HR_ACCESS : PM_ACCESS
  for (const c of codes) {
    if (set.has(c)) return true
  }
  return false
}

export function userCanAccessDashboard(codes: string[]): boolean {
  if (codes.length === 0) return false
  const s = new Set(codes)
  return hasModuleAccess(s, 'finance') || hasModuleAccess(s, 'hr') || hasModuleAccess(s, 'pm')
}

async function financeBlock(includeCashBalance: boolean): Promise<DashboardSummaryResponse['finance']> {
  const bkkNow = sql`(timezone('Asia/Bangkok', now()))`
  const monthStart = sql`date_trunc('month', ${bkkNow})::timestamp`
  const monthEnd = sql`(date_trunc('month', ${bkkNow}) + interval '1 month')::timestamp`
  const yearStart = sql`date_trunc('year', ${bkkNow})::timestamp`
  const endOfTodayBkk = sql`(date_trunc('day', ${bkkNow}) + interval '1 day')::timestamp`
  const todayBkk = sql`((timezone('Asia/Bangkok', now()))::date)`

  const [mtdRow] = await db
    .select({
      s: sql<string>`coalesce(sum(${invoices.total}::numeric),0)::text`,
    })
    .from(invoices)
    .where(
      and(
        notInArray(invoices.status, ['draft', 'cancelled']),
        sql`${invoices.issueDate} >= ${monthStart}`,
        sql`${invoices.issueDate} < ${monthEnd}`
      )
    )

  const [ytdRow] = await db
    .select({
      s: sql<string>`coalesce(sum(${invoices.total}::numeric),0)::text`,
    })
    .from(invoices)
    .where(
      and(
        notInArray(invoices.status, ['draft', 'cancelled']),
        sql`${invoices.issueDate} >= ${yearStart}`,
        sql`${invoices.issueDate} < ${endOfTodayBkk}`
      )
    )

  const [arRow] = await db
    .select({
      s: sql<string>`coalesce(sum(${invoices.total}::numeric - ${invoices.paidAmount}::numeric),0)::text`,
    })
    .from(invoices)
    .where(notInArray(invoices.status, ['draft', 'paid', 'cancelled']))

  const [apMtd] = await db
    .select({
      s: sql<string>`coalesce(sum(${apBills.totalAmount}::numeric),0)::text`,
    })
    .from(apBills)
    .where(
      and(
        notInArray(apBills.status, ['draft', 'rejected']),
        sql`${apBills.issueDate} >= ${monthStart}`,
        sql`${apBills.issueDate} < ${monthEnd}`
      )
    )

  const [apOd] = await db
    .select({ c: count() })
    .from(apBills)
    .where(
      sql`${apBills.dueDate}::date < ${todayBkk} and ${apBills.status} not in ('paid','rejected')`
    )

  const revenueThisMonth = Number(mtdRow?.s ?? 0)
  const revenueYTD = Number(ytdRow?.s ?? 0)
  const expenseThisMonth = Number(apMtd?.s ?? 0)
  const arOutstanding = Number(arRow?.s ?? 0)
  const apOverdueCount = Number(apOd?.c ?? 0)
  const netProfitThisMonth = revenueThisMonth - expenseThisMonth

  const out: DashboardSummaryResponse['finance'] = {
    revenueThisMonth,
    revenueYTD,
    expenseThisMonth,
    arOutstanding,
    apOverdueCount,
    netProfitThisMonth,
  }

  if (includeCashBalance) {
    const [bc] = await db.select({ c: count() }).from(bankAccounts)
    const cnt = Number(bc?.c ?? 0)
    if (cnt > 0) {
      const [cashRow] = await db
        .select({
          s: sql<string>`coalesce(sum(${bankAccounts.currentBalance}::numeric) filter (where ${bankAccounts.isActive} = true), 0)::text`,
        })
        .from(bankAccounts)
      out.cashBalance = Number(cashRow?.s ?? 0)
    }
  }

  return out
}

async function hrBlock(): Promise<DashboardSummaryResponse['hr']> {
  const [hc] = await db
    .select({ c: count() })
    .from(employees)
    .where(eq(employees.status, 'active'))

  const [lv] = await db
    .select({ c: count() })
    .from(leaveRequests)
    .where(eq(leaveRequests.status, 'pending'))

  const [ot] = await db
    .select({ c: count() })
    .from(overtimeRequests)
    .where(eq(overtimeRequests.status, 'pending'))

  const upcoming = await db
    .select({
      periodMonth: payrollRuns.periodMonth,
      periodYear: payrollRuns.periodYear,
    })
    .from(payrollRuns)
    .where(notInArray(payrollRuns.status, ['paid']))
    .orderBy(asc(payrollRuns.periodYear), asc(payrollRuns.periodMonth))
    .limit(1)

  const first = upcoming[0]
  let nextPayrollDate: string | null = null
  if (first) {
    const last = new Date(Date.UTC(first.periodYear, first.periodMonth, 0))
    nextPayrollDate = last.toISOString().slice(0, 10)
  }

  return {
    totalHeadcount: Number(hc?.c ?? 0),
    pendingLeaveRequests: Number(lv?.c ?? 0),
    nextPayrollDate,
    pendingOTApprovals: Number(ot?.c ?? 0),
  }
}

async function pmBlock(): Promise<DashboardSummaryResponse['pm']> {
  const [activeB] = await db
    .select({ c: count() })
    .from(pmBudgets)
    .where(sql`lower(trim(${pmBudgets.status})) in ('active','approved')`)

  const [inProg] = await db
    .select({ c: count() })
    .from(pmProgressTasks)
    .where(
      sql`(lower(trim(${pmProgressTasks.status})) = 'in_progress' or ${pmProgressTasks.status} ilike 'in progress')`
    )

  const todayBkk = sql`((timezone('Asia/Bangkok', now()))::date)`
  const [overdue] = await db
    .select({ c: count() })
    .from(pmProgressTasks)
    .where(
      sql`${pmProgressTasks.targetDate}::date < ${todayBkk} and ${isNull(pmProgressTasks.actualEndDate)} and lower(trim(${pmProgressTasks.status})) not in ('done','cancelled')`
    )

  const utilRows = await db
    .select({
      total: pmBudgets.totalAmount,
      spent: sql<string>`coalesce(sum(${pmExpenses.amount}::numeric),0)::text`,
    })
    .from(pmBudgets)
    .leftJoin(pmExpenses, eq(pmExpenses.budgetId, pmBudgets.id))
    .groupBy(pmBudgets.id, pmBudgets.totalAmount)

  let sumPct = 0
  let n = 0
  for (const r of utilRows) {
    const tot = Number(r.total)
    if (!tot) continue
    const pct = (Number(r.spent) / tot) * 100
    sumPct += pct
    n += 1
  }
  const avgBudgetUtilization = n ? Math.round((sumPct / n) * 10) / 10 : 0

  return {
    activeBudgets: Number(activeB?.c ?? 0),
    tasksInProgress: Number(inProg?.c ?? 0),
    tasksOverdue: Number(overdue?.c ?? 0),
    avgBudgetUtilization,
  }
}

async function buildAlerts(canFinance: boolean, canHr: boolean): Promise<DashboardSummaryResponse['alerts']> {
  const todayBkk = sql`((timezone('Asia/Bangkok', now()))::date)`
  const out: DashboardSummaryResponse['alerts'] = []

  if (canFinance) {
    const [inv] = await db
      .select({ c: count() })
      .from(invoices)
      .where(
        sql`${invoices.dueDate}::date < ${todayBkk} and ${invoices.status} not in ('paid','draft','cancelled')`
      )
    const n = Number(inv?.c ?? 0)
    if (n > 0) out.push({ type: 'invoice_overdue', count: n, url: '/finance/reports/ar-aging' })

    const [ap] = await db
      .select({ c: count() })
      .from(apBills)
      .where(sql`${apBills.dueDate}::date < ${todayBkk} and ${apBills.status} not in ('paid','rejected')`)
    const m = Number(ap?.c ?? 0)
    if (m > 0) out.push({ type: 'ap_overdue', count: m, url: '/finance/ap' })
  }

  if (canHr) {
    const [lv] = await db
      .select({ c: count() })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, 'pending'))
    const k = Number(lv?.c ?? 0)
    if (k > 0) out.push({ type: 'leave_pending', count: k, url: '/hr/leaves' })
  }

  return out
}

export const DashboardSummaryService = {
  async build(permissionCodes: string[]): Promise<DashboardSummaryResponse> {
    const codes = new Set(permissionCodes)
    const trimmed: ('finance' | 'hr' | 'pm')[] = []
    const canF = isEnabled('finance') && hasModuleAccess(codes, 'finance')
    const canH = isEnabled('hr') && hasModuleAccess(codes, 'hr')
    const canP = isEnabled('pm') && hasModuleAccess(codes, 'pm')
    const includeCash = codes.has('finance:bank_account:view')

    if (!canF) trimmed.push('finance')
    if (!canH) trimmed.push('hr')
    if (!canP) trimmed.push('pm')

    const [finance, hr, pm, alerts] = await Promise.all([
      canF ? financeBlock(includeCash) : Promise.resolve(undefined),
      canH ? hrBlock() : Promise.resolve(undefined),
      canP ? pmBlock() : Promise.resolve(undefined),
      buildAlerts(canF, canH),
    ])

    return {
      ...(finance ? { finance } : {}),
      ...(hr ? { hr } : {}),
      ...(pm ? { pm } : {}),
      alerts,
      meta: {
        asOf: new Date().toISOString(),
        freshnessSeconds: 60,
        permissionTrimmedModules: trimmed,
        widgetVisibilityMode: 'omit_widget',
      },
    }
  },
}
