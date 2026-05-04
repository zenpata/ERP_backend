import { and, asc, count, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { chartOfAccounts, journalEntries, journalLines } from '../../finance.schema'
import { assertPeriodNotLocked } from '../period-lock/period-lock.guard'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type JournalLineInput = {
  accountId: string
  debit: string | number
  credit: string | number
  description?: string
}

async function nextEntryNumber(tx: Tx): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(882001)`)
  const rows = await tx.select({ n: sql<number>`count(*)::int` }).from(journalEntries)
  const n = (rows[0]?.n ?? 0) + 1
  return `JE-${String(n).padStart(6, '0')}`
}

function sumMoney(lines: JournalLineInput[], key: 'debit' | 'credit'): number {
  let s = 0
  for (const l of lines) {
    const v = Number(key === 'debit' ? l.debit : l.credit)
    if (!Number.isFinite(v) || v < 0) throw new ValidationError({ lines: ['Invalid amount'] })
    s += v
  }
  return Math.round(s * 100) / 100
}

function validateLines(lines: JournalLineInput[]): void {
  if (lines.length < 2) {
    throw new ValidationError({ lines: ['At least two lines required'] })
  }
  for (const l of lines) {
    const d = Number(l.debit)
    const c = Number(l.credit)
    if ((d > 0 && c > 0) || (d === 0 && c === 0)) {
      throw new ValidationError({ lines: ['Each line must have either debit or credit > 0, not both'] })
    }
  }
  const totalDebit = sumMoney(lines, 'debit')
  const totalCredit = sumMoney(lines, 'credit')
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new ValidationError({
      lines: [`Total debit (${totalDebit}) must equal total credit (${totalCredit})`],
    })
  }
}

async function validateAccounts(tx: Tx, lines: JournalLineInput[]): Promise<void> {
  const accountIds = [...new Set(lines.map((l) => l.accountId))]
  const accRows = await tx
    .select({ id: chartOfAccounts.id, isActive: chartOfAccounts.isActive })
    .from(chartOfAccounts)
    .where(inArray(chartOfAccounts.id, accountIds))

  if (accRows.length !== accountIds.length) {
    throw new ValidationError({ lines: ['Unknown account id'] })
  }
  const inactive = accRows.filter((a) => !a.isActive)
  if (inactive.length > 0) {
    throw new ValidationError({ lines: ['One or more accounts are inactive'] })
  }
}

export type ListJournalQuery = {
  page?: number
  perPage?: number
  status?: string
  source?: string
  dateFrom?: string
  dateTo?: string
  accountId?: string
  search?: string
}

export const JournalService = {
  async list(params: ListJournalQuery): Promise<PaginatedResult<typeof journalEntries.$inferSelect>> {
    const page = params.page ?? 1
    const perPage = Math.min(params.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = []
    if (params.status) conditions.push(eq(journalEntries.status, params.status))
    if (params.source) conditions.push(eq(journalEntries.source, params.source))
    if (params.dateFrom) conditions.push(gte(journalEntries.date, new Date(params.dateFrom)))
    if (params.dateTo) {
      const end = new Date(params.dateTo)
      end.setHours(23, 59, 59, 999)
      conditions.push(lte(journalEntries.date, end))
    }
    if (params.search) conditions.push(ilike(journalEntries.description, `%${params.search}%`))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [totalRow] = await db.select({ c: count() }).from(journalEntries).where(where)
    const total = Number(totalRow?.c ?? 0)
    const data = await db
      .select()
      .from(journalEntries)
      .where(where)
      .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
      .limit(perPage)
      .offset(offset)
    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  },

  async getById(id: string): Promise<{
    entry: typeof journalEntries.$inferSelect
    lines: (typeof journalLines.$inferSelect & { accountCode: string | null; accountName: string | null })[]
  } | null> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1)
    if (!entry) return null
    const lines = await db
      .select({
        id: journalLines.id,
        entryId: journalLines.entryId,
        accountId: journalLines.accountId,
        debit: journalLines.debit,
        credit: journalLines.credit,
        description: journalLines.description,
        projectBudgetId: journalLines.projectBudgetId,
        accountCode: chartOfAccounts.code,
        accountName: chartOfAccounts.name,
      })
      .from(journalLines)
      .leftJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
      .where(eq(journalLines.entryId, id))
      .orderBy(asc(journalLines.id))
    return { entry, lines }
  },

  /** R3-01: Create journal as draft (replaces old create which posted immediately) */
  async createDraft(input: {
    date: string
    description: string
    referenceNo?: string
    lines: JournalLineInput[]
    createdBy?: string
  }): Promise<{ entry: typeof journalEntries.$inferSelect; lines: (typeof journalLines.$inferSelect)[] }> {
    validateLines(input.lines)
    const date = new Date(input.date)
    if (Number.isNaN(date.getTime())) throw new ValidationError({ date: ['Invalid date'] })

    await assertPeriodNotLocked(date)

    const totalDebit = sumMoney(input.lines, 'debit')
    const totalCredit = sumMoney(input.lines, 'credit')

    return db.transaction(async (tx) => {
      await validateAccounts(tx, input.lines)
      const entryNumber = await nextEntryNumber(tx)
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          entryNumber,
          type: 'manual',
          status: 'draft',
          source: 'manual',
          date,
          description: input.description.trim(),
          referenceNo: input.referenceNo?.trim(),
          totalDebit: String(totalDebit),
          totalCredit: String(totalCredit),
          createdBy: input.createdBy,
        })
        .returning()
      if (!entry) throw new AppError('JOURNAL_CREATE_FAILED', 'บันทึกรายการล้มเหลว', 500)

      const lineRows = await tx
        .insert(journalLines)
        .values(
          input.lines.map((l) => ({
            entryId: entry.id,
            accountId: l.accountId,
            debit: String(l.debit),
            credit: String(l.credit),
            description: l.description?.trim(),
          }))
        )
        .returning()

      return { entry, lines: lineRows }
    })
  },

  /** R3-01: Update a draft journal entry */
  async updateDraft(
    id: string,
    input: {
      date?: string
      description?: string
      referenceNo?: string
      lines?: JournalLineInput[]
    }
  ): Promise<{ entry: typeof journalEntries.$inferSelect; lines: (typeof journalLines.$inferSelect)[] }> {
    const [existing] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1)
    if (!existing) throw new NotFoundError('journal entry')
    if (existing.status !== 'draft') {
      throw new ValidationError({ status: ['Only draft journals can be edited'] })
    }
    if (existing.source !== 'manual') {
      throw new ValidationError({ source: ['System-generated journals cannot be edited'] })
    }

    const lines = input.lines ?? []

    if (lines.length > 0) validateLines(lines)

    const date = input.date ? new Date(input.date) : existing.date
    if (input.date && Number.isNaN(date.getTime())) throw new ValidationError({ date: ['Invalid date'] })

    return db.transaction(async (tx) => {
      const updates: Partial<typeof journalEntries.$inferInsert> = {}
      if (input.date) {
        await assertPeriodNotLocked(date)
        updates.date = date
      }
      if (input.description) updates.description = input.description.trim()
      if (input.referenceNo !== undefined) updates.referenceNo = input.referenceNo.trim()

      if (lines.length > 0) {
        await validateAccounts(tx, lines)
        updates.totalDebit = String(sumMoney(lines, 'debit'))
        updates.totalCredit = String(sumMoney(lines, 'credit'))
      }

      const [entry] = await tx
        .update(journalEntries)
        .set(updates)
        .where(eq(journalEntries.id, id))
        .returning()
      if (!entry) throw new AppError('JOURNAL_UPDATE_FAILED', 'แก้ไขรายการล้มเหลว', 500)

      let lineRows: (typeof journalLines.$inferSelect)[]
      if (lines.length > 0) {
        await tx.delete(journalLines).where(eq(journalLines.entryId, id))
        lineRows = await tx
          .insert(journalLines)
          .values(
            lines.map((l) => ({
              entryId: id,
              accountId: l.accountId,
              debit: String(l.debit),
              credit: String(l.credit),
              description: l.description?.trim(),
            }))
          )
          .returning()
      } else {
        lineRows = await db.select().from(journalLines).where(eq(journalLines.entryId, id))
      }

      return { entry, lines: lineRows }
    })
  },

  /** R3-01: Post a draft journal entry */
  async postEntry(
    id: string,
    userId: string
  ): Promise<typeof journalEntries.$inferSelect> {
    const [existing] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1)
    if (!existing) throw new NotFoundError('journal entry')
    if (existing.status === 'posted') {
      throw new ValidationError({ status: ['Journal is already posted'] })
    }
    if (existing.status === 'reversed') {
      throw new ValidationError({ status: ['Cannot post a reversed journal'] })
    }
    if (existing.status !== 'draft' && existing.status !== 'pending_review') {
      throw new ValidationError({ status: [`Cannot post journal with status: ${existing.status}`] })
    }

    await assertPeriodNotLocked(existing.date)

    // Re-validate balance before posting
    const lines = await db.select().from(journalLines).where(eq(journalLines.entryId, id))
    validateLines(lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })))

    const [updated] = await db
      .update(journalEntries)
      .set({ status: 'posted', postedAt: new Date(), postedBy: userId })
      .where(eq(journalEntries.id, id))
      .returning()
    if (!updated) throw new AppError('JOURNAL_POST_FAILED', 'Post journal ล้มเหลว', 500)
    return updated
  },

  /** R3-01: Create a reversal for a posted manual journal */
  async reverseEntry(
    id: string,
    reverseDate: string,
    userId: string,
    description?: string
  ): Promise<{ original: typeof journalEntries.$inferSelect; reversal: typeof journalEntries.$inferSelect }> {
    const [original] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1)
    if (!original) throw new NotFoundError('journal entry')
    if (original.status !== 'posted') {
      throw new ValidationError({ status: ['Only posted journals can be reversed'] })
    }
    if (original.source !== 'manual') {
      throw new ValidationError({ source: ['System-generated journals cannot be reversed'] })
    }
    if (original.reversedById) {
      throw new AppError('JOURNAL_ALREADY_REVERSED', 'รายการนี้ถูก reverse แล้ว', 409)
    }

    const revDate = new Date(reverseDate)
    if (Number.isNaN(revDate.getTime())) throw new ValidationError({ reverseDate: ['Invalid date'] })
    await assertPeriodNotLocked(revDate)

    const originalLines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.entryId, id))

    const reversalLines: JournalLineInput[] = originalLines.map((l) => {
      const out: JournalLineInput = {
        accountId: l.accountId,
        debit: l.credit, // swap debit/credit
        credit: l.debit,
      }
      if (l.description) out.description = l.description
      return out
    })

    const totalDebit = sumMoney(reversalLines, 'debit')
    const totalCredit = sumMoney(reversalLines, 'credit')

    return db.transaction(async (tx) => {
      const entryNumber = await nextEntryNumber(tx)
      const [reversal] = await tx
        .insert(journalEntries)
        .values({
          entryNumber,
          type: 'manual',
          status: 'posted',
          source: 'manual',
          date: revDate,
          description: (description ?? `ยกเลิก ${original.entryNumber}`).trim(),
          referenceNo: original.entryNumber,
          totalDebit: String(totalDebit),
          totalCredit: String(totalCredit),
          createdBy: userId,
          postedAt: new Date(),
          postedBy: userId,
        })
        .returning()
      if (!reversal) throw new AppError('REVERSAL_CREATE_FAILED', 'สร้างรายการยกเลิกล้มเหลว', 500)

      await tx.insert(journalLines).values(
        reversalLines.map((l) => ({
          entryId: reversal.id,
          accountId: l.accountId,
          debit: String(l.debit),
          credit: String(l.credit),
          description: l.description?.trim(),
        }))
      )

      // Mark original as reversed
      const [updatedOriginal] = await tx
        .update(journalEntries)
        .set({ status: 'reversed', reversedById: reversal.id })
        .where(eq(journalEntries.id, id))
        .returning()
      if (!updatedOriginal) throw new AppError('REVERSAL_LINK_FAILED', 'ล้มเหลวในการอัปเดตรายการเดิม', 500)

      return { original: updatedOriginal, reversal }
    })
  },

  /** Legacy: create and immediately post (kept for internal auto-journaling) */
  async create(input: {
    date: string
    description: string
    lines: JournalLineInput[]
    type?: string
    source?: string
    referenceId?: string
    createdBy?: string
  }): Promise<{ entry: typeof journalEntries.$inferSelect; lines: (typeof journalLines.$inferSelect)[] }> {
    const lines = input.lines
    validateLines(lines)
    const date = new Date(input.date)
    if (Number.isNaN(date.getTime())) throw new ValidationError({ date: ['Invalid date'] })

    const totalDebit = sumMoney(lines, 'debit')
    const totalCredit = sumMoney(lines, 'credit')

    return db.transaction(async (tx) => {
      await validateAccounts(tx, lines)
      const entryNumber = await nextEntryNumber(tx)
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          entryNumber,
          type: input.type ?? 'manual',
          status: 'posted',
          source: input.source ?? 'manual',
          date,
          description: input.description.trim(),
          referenceId: input.referenceId,
          totalDebit: String(totalDebit),
          totalCredit: String(totalCredit),
          createdBy: input.createdBy,
          postedAt: new Date(),
        })
        .returning()
      if (!entry) throw new ValidationError({ _: ['Journal insert failed'] })

      const lineRows = await tx
        .insert(journalLines)
        .values(
          lines.map((l) => ({
            entryId: entry.id,
            accountId: l.accountId,
            debit: String(l.debit),
            credit: String(l.credit),
            description: l.description?.trim(),
          }))
        )
        .returning()

      return { entry, lines: lineRows }
    })
  },
}
