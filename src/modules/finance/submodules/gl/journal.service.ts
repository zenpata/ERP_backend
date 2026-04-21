import { asc, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { chartOfAccounts, journalEntries, journalLines } from '../../finance.schema'

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

export const JournalService = {
  async list(params: {
    page?: number
    perPage?: number
  }): Promise<PaginatedResult<typeof journalEntries.$inferSelect>> {
    const page = params.page ?? 1
    const perPage = Math.min(params.perPage ?? 20, 100)
    const offset = (page - 1) * perPage
    const [totalRow] = await db.select({ c: count() }).from(journalEntries)
    const total = Number(totalRow?.c ?? 0)
    const data = await db
      .select()
      .from(journalEntries)
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
    lines: (typeof journalLines.$inferSelect)[]
  } | null> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1)
    if (!entry) return null
    const lines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.entryId, id))
      .orderBy(asc(journalLines.id))
    return { entry, lines }
  },

  async create(input: {
    date: string
    description: string
    lines: JournalLineInput[]
    type?: string
  }): Promise<{ entry: typeof journalEntries.$inferSelect; lines: (typeof journalLines.$inferSelect)[] }> {
    const lines = input.lines
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
      throw new ValidationError({ lines: ['Total debit must equal total credit'] })
    }

    const accountIds = [...new Set(lines.map((l) => l.accountId))]
    const accRows = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(inArray(chartOfAccounts.id, accountIds))
    if (accRows.length !== accountIds.length) {
      throw new ValidationError({ lines: ['Unknown account id'] })
    }

    const date = new Date(input.date)
    if (Number.isNaN(date.getTime())) throw new ValidationError({ date: ['Invalid date'] })

    return db.transaction(async (tx) => {
      const entryNumber = await nextEntryNumber(tx)
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          entryNumber,
          type: input.type ?? 'manual',
          date,
          description: input.description.trim(),
          totalDebit: String(totalDebit),
          totalCredit: String(totalCredit),
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
