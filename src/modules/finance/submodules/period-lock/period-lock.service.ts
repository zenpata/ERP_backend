import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/middleware/error.middleware'
import { journalEntries } from '../../finance.schema'
import { accountingPeriods } from '../../finance.schema'

// ============================================================
// period-lock.service.ts — Accounting Period Lock (R3-08)
// ============================================================

function toYearMonth(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export const PeriodLockService = {
  async list(): Promise<(typeof accountingPeriods.$inferSelect & { draftJournalCount: number })[]> {
    const rows = await db.select().from(accountingPeriods).orderBy(desc(accountingPeriods.period))

    // Count draft journals per period
    const draftCounts = await db
      .select({
        period: sql<string>`to_char(${journalEntries.date}, 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
      })
      .from(journalEntries)
      .where(eq(journalEntries.status, 'draft'))
      .groupBy(sql`to_char(${journalEntries.date}, 'YYYY-MM')`)

    const draftMap = new Map(draftCounts.map((r) => [r.period, r.count]))

    return rows.map((r) => ({
      ...r,
      draftJournalCount: draftMap.get(r.period) ?? 0,
    }))
  },

  async getOrCreate(period: string): Promise<typeof accountingPeriods.$inferSelect> {
    const [existing] = await db
      .select()
      .from(accountingPeriods)
      .where(eq(accountingPeriods.period, period))
      .limit(1)
    if (existing) return existing

    const [created] = await db
      .insert(accountingPeriods)
      .values({ period, status: 'open' })
      .returning()
    if (!created) throw new AppError('PERIOD_CREATE_FAILED', 'ไม่สามารถสร้าง accounting period ได้', 500)
    return created
  },

  async lock(period: string, userId: string): Promise<typeof accountingPeriods.$inferSelect> {
    const row = await this.getOrCreate(period)
    if (row.status === 'locked') {
      throw new ConflictError('PERIOD_ALREADY_LOCKED', `Period ${period} ถูกล็อคแล้ว`)
    }
    const [updated] = await db
      .update(accountingPeriods)
      .set({ status: 'locked', lockedBy: userId, lockedAt: new Date() })
      .where(and(eq(accountingPeriods.period, period), eq(accountingPeriods.status, 'open')))
      .returning()
    if (!updated) throw new AppError('PERIOD_LOCK_FAILED', 'ไม่สามารถล็อค period ได้', 500)
    return updated
  },

  async unlock(
    period: string,
    userId: string,
    reason: string,
    isSuperAdmin: boolean
  ): Promise<typeof accountingPeriods.$inferSelect> {
    if (!isSuperAdmin) throw new ForbiddenError('เฉพาะ super_admin เท่านั้นที่สามารถปลดล็อค period ได้')

    const [existing] = await db
      .select()
      .from(accountingPeriods)
      .where(eq(accountingPeriods.period, period))
      .limit(1)
    if (!existing) throw new NotFoundError('accounting period')
    if (existing.status === 'open') {
      throw new ConflictError('PERIOD_NOT_LOCKED', `Period ${period} ยังไม่ได้ถูกล็อค`)
    }

    const [updated] = await db
      .update(accountingPeriods)
      .set({ status: 'open', unlockedBy: userId, unlockReason: reason, unlockedAt: new Date() })
      .where(eq(accountingPeriods.period, period))
      .returning()
    if (!updated) throw new AppError('PERIOD_UNLOCK_FAILED', 'ไม่สามารถปลดล็อค period ได้', 500)
    return updated
  },
}

export { toYearMonth }
