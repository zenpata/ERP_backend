import { count, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { pmBudgets, pmExpenses, pmProgressTasks } from '../../pm.schema'

/** Aggregated PM KPIs for global dashboard (subset — cross-module widgets ตาม BR ขยายทีหลัง). */
export const GlobalDashboardService = {
  async getPmSnapshot(): Promise<{
    budgetCount: number
    expenseCount: number
    openTasks: number
  }> {
    const [b] = await db.select({ c: count() }).from(pmBudgets)
    const [e] = await db.select({ c: count() }).from(pmExpenses)
    const [t] = await db
      .select({ c: count() })
      .from(pmProgressTasks)
      .where(sql`${pmProgressTasks.status} NOT IN ('Done', 'Cancelled')`)
    return {
      budgetCount: Number(b?.c ?? 0),
      expenseCount: Number(e?.c ?? 0),
      openTasks: Number(t?.c ?? 0),
    }
  },
}
