import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import {
  bankStatementImports,
  bankStatementLines,
  bankAccounts,
  invoices,
} from '../../finance.schema'
import { MatchEngine } from './match-engine'

// ============================================================
// bank-reconcile.service.ts — Bank Statement Import & Reconciliation (R3-04)
// ============================================================

export type ListImportsQuery = {
  page?: number
  perPage?: number
  bankAccountId?: string
}

export const BankReconcileService = {
  async listImports(query: ListImportsQuery = {}) {
    const page = query.page ?? 1
    const perPage = query.perPage ?? 20
    const offset = (page - 1) * perPage

    const where = query.bankAccountId
      ? eq(bankStatementImports.bankAccountId, query.bankAccountId)
      : undefined

    const [items, countRows] = await Promise.all([
      db
        .select({
          id: bankStatementImports.id,
          bankAccountId: bankStatementImports.bankAccountId,
          periodFrom: bankStatementImports.periodFrom,
          periodTo: bankStatementImports.periodTo,
          totalLines: bankStatementImports.totalLines,
          matchedLines: bankStatementImports.matchedLines,
          status: bankStatementImports.status,
          importedAt: bankStatementImports.importedAt,
        })
        .from(bankStatementImports)
        .where(where)
        .orderBy(sql`${bankStatementImports.importedAt} DESC`)
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bankStatementImports)
        .where(where),
    ])

    const count = countRows[0]?.count ?? 0

    return {
      data: items,
      meta: {
        page,
        perPage,
        total: count,
        totalPages: Math.ceil(count / perPage),
      },
    }
  },

  async getImportLines(
    importId: string,
    matchStatus?: string
  ) {
    const where = matchStatus
      ? and(eq(bankStatementLines.importId, importId), eq(bankStatementLines.matchStatus, matchStatus))
      : eq(bankStatementLines.importId, importId)

    return db
      .select()
      .from(bankStatementLines)
      .where(where)
      .orderBy(sql`${bankStatementLines.txDate} ASC`)
  },

  async createImport(input: {
    bankAccountId: string
    periodFrom: string
    periodTo: string
    lines: Array<{
      transactionDate: string
      description: string
      amount: number
      referenceNo?: string
    }>
  }) {
    // Check bank account exists
    const [account] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, input.bankAccountId))
      .limit(1)

    if (!account) throw new NotFoundError('bank account')

    // Check for duplicate import
    const [existing] = await db
      .select()
      .from(bankStatementImports)
      .where(
        and(
          eq(bankStatementImports.bankAccountId, input.bankAccountId),
          eq(bankStatementImports.periodFrom, input.periodFrom),
          eq(bankStatementImports.periodTo, input.periodTo)
        )
      )
      .limit(1)

    if (existing) {
      throw new ValidationError({
        period: ['Import for this period already exists'],
      })
    }

    // Create import
    const [importRecord] = await db
      .insert(bankStatementImports)
      .values({
        bankAccountId: input.bankAccountId,
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        totalLines: input.lines.length,
        matchedLines: 0,
        status: 'pending',
      })
      .returning()

    if (!importRecord) throw new Error('Failed to create import')

    // Insert lines and auto-match against any open AR invoice
    const openInvoiceRows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(sql`${invoices.status} IN ('issued', 'partially_paid')`)

    const openInvoices = openInvoiceRows.map((r) => ({
      ...r,
      total: Number(r.total),
    }))

    const matches = MatchEngine.autoMatchBatch(
      input.lines.map((l, idx) => {
        const line: {
          id: string
          amount: number
          description: string
          date: Date
          referenceNo?: string
        } = {
          id: `temp-${idx}`,
          amount: l.amount,
          description: l.description,
          date: new Date(l.transactionDate),
        }
        if (l.referenceNo) line.referenceNo = l.referenceNo
        return line
      }),
      openInvoices
    )

    let matchedCount = 0
    for (let idx = 0; idx < input.lines.length; idx++) {
      const line = input.lines[idx]
      if (!line) continue
      const match = matches.get(`temp-${idx}`)

      await db
        .insert(bankStatementLines)
        .values({
          importId: importRecord.id,
          txDate: line.transactionDate,
          description: line.description.trim(),
          amount: String(line.amount),
          referenceNo: line.referenceNo || null,
          matchStatus: match?.matchStatus ?? 'unmatched',
          matchedTxId: match?.invoiceId || null,
          matchedTxType: match?.invoiceId ? 'ar_payment' : null,
        })

      if (match?.matchStatus === 'exact') {
        matchedCount++
      }
    }

    // Update import with match count
    await db
      .update(bankStatementImports)
      .set({ matchedLines: matchedCount })
      .where(eq(bankStatementImports.id, importRecord.id))

    return { importId: importRecord.id, matchedCount, totalLines: input.lines.length }
  },

  async confirmMatches(importId: string, lineIds: string[]) {
    // Bulk confirm matches as exact
    await db
      .update(bankStatementLines)
      .set({ matchStatus: 'exact' })
      .where(and(eq(bankStatementLines.importId, importId), sql`${bankStatementLines.id} = ANY(${lineIds})`))

    return { confirmed: lineIds.length }
  },

  async matchLine(lineId: string, invoiceId?: string) {
    const [line] = await db
      .select()
      .from(bankStatementLines)
      .where(eq(bankStatementLines.id, lineId))
      .limit(1)

    if (!line) throw new NotFoundError('statement line')

    const updatedStatus = invoiceId ? 'exact' : 'unmatched'
    const [updated] = await db
      .update(bankStatementLines)
      .set({
        matchedTxId: invoiceId || null,
        matchedTxType: invoiceId ? 'ar_payment' : null,
        matchStatus: updatedStatus,
      })
      .where(eq(bankStatementLines.id, lineId))
      .returning()

    return updated
  },

  async getMatchSummary(importId: string) {
    const [summary] = await db
      .select({
        total: sql<number>`count(*)::int`,
        exact: sql<number>`count(*) FILTER (WHERE ${bankStatementLines.matchStatus} = 'exact')`,
        probable: sql<number>`count(*) FILTER (WHERE ${bankStatementLines.matchStatus} = 'probable')`,
        unmatched: sql<number>`count(*) FILTER (WHERE ${bankStatementLines.matchStatus} = 'unmatched')`,
      })
      .from(bankStatementLines)
      .where(eq(bankStatementLines.importId, importId))

    return summary || { total: 0, exact: 0, probable: 0, unmatched: 0 }
  },
}
