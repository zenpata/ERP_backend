import { eq } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { AppError } from '../../../../shared/middleware/error.middleware'
import { accountingPeriods } from '../../finance.schema'

// ============================================================
// period-lock.guard.ts — Cross-cutting period lock validation
// Called by journal, invoice, AP, inventory, and other transaction endpoints
// ============================================================

function dateToPeriod(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Throws PERIOD_LOCKED (422) if the given transaction date falls in a locked period.
 * Auto-creates an open period record if one does not exist yet.
 */
export async function assertPeriodNotLocked(txDate: Date | string): Promise<void> {
  const period = dateToPeriod(txDate)

  const [row] = await db
    .select({ status: accountingPeriods.status })
    .from(accountingPeriods)
    .where(eq(accountingPeriods.period, period))
    .limit(1)

  if (!row) {
    // Auto-create open period on first transaction
    await db
      .insert(accountingPeriods)
      .values({ period, status: 'open' })
      .onConflictDoNothing()
    return
  }

  if (row.status === 'locked') {
    throw new AppError(
      'PERIOD_LOCKED',
      `Period ${period} ถูกล็อคแล้ว ไม่สามารถบันทึกรายการในช่วงเวลานี้ได้`,
      422
    )
  }
}
