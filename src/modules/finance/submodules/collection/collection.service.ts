import { and, asc, desc, eq, isNull, lte, or, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { NotFoundError } from '../../../../shared/middleware/error.middleware'
import {
  customers,
  invoiceCollectionNotes,
  invoicePayments,
  invoices,
} from '../../finance.schema'

// ============================================================
// collection.service.ts — AR Collection Workflow (R3-03)
// ============================================================

export const CollectionService = {
  /** List collection notes for an invoice (chronological) */
  async listNotes(invoiceId: string) {
    const [inv] = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.id, invoiceId)).limit(1)
    if (!inv) throw new NotFoundError('invoice')

    return db
      .select()
      .from(invoiceCollectionNotes)
      .where(eq(invoiceCollectionNotes.invoiceId, invoiceId))
      .orderBy(asc(invoiceCollectionNotes.createdAt))
  },

  /** Add a collection note (with optional promise-to-pay) */
  async addNote(
    invoiceId: string,
    input: {
      type: string
      notes: string
      promisedPayDate?: string
      promisedAmount?: number | string
      createdBy?: string
    }
  ) {
    const [inv] = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.id, invoiceId)).limit(1)
    if (!inv) throw new NotFoundError('invoice')

    const [note] = await db
      .insert(invoiceCollectionNotes)
      .values({
        invoiceId,
        type: input.type,
        notes: input.notes.trim(),
        promisedPayDate: input.promisedPayDate ?? null,
        promisedAmount: input.promisedAmount != null ? String(input.promisedAmount) : null,
        createdBy: input.createdBy,
      })
      .returning()
    return note
  },

  /** Customer AR summary — credit info + open invoices + all collection history */
  async customerArSummary(customerId: string) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), isNull(customers.deletedAt)))
      .limit(1)
    if (!customer) throw new NotFoundError('customer')

    const openInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, customerId),
          or(
            eq(invoices.status, 'issued'),
            eq(invoices.status, 'partially_paid'),
            eq(invoices.status, 'overdue')
          )
        )
      )
      .orderBy(desc(invoices.dueDate))

    const nowBkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))

    const openWithBalance = openInvoices.map((inv) => {
      const balanceDue = Number(inv.total) - Number(inv.paidAmount)
      const dueDate = new Date(inv.dueDate)
      const daysOverdue = inv.status === 'overdue' || dueDate < nowBkk
        ? Math.max(0, Math.floor((nowBkk.getTime() - dueDate.getTime()) / 86_400_000))
        : 0
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        total: inv.total,
        paidAmount: inv.paidAmount,
        balanceDue: String(balanceDue),
        status: inv.status,
        daysOverdue,
      }
    })

    const creditUsed = openInvoices.reduce(
      (sum, inv) => sum + (Number(inv.total) - Number(inv.paidAmount)),
      0
    )
    const creditLimit = Number(customer.creditLimit)
    const creditAvailable = Math.max(0, creditLimit - creditUsed)

    // All collection notes from all customer invoices
    const allInvoiceIds = (
      await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.customerId, customerId))
    ).map((r) => r.id)

    let collectionHistory: (typeof invoiceCollectionNotes.$inferSelect)[] = []
    if (allInvoiceIds.length > 0) {
      const allNotes = await db
        .select()
        .from(invoiceCollectionNotes)
        .where(sql`${invoiceCollectionNotes.invoiceId} = ANY(ARRAY[${sql.join(allInvoiceIds.map((id) => sql`${id}::uuid`), sql`, `)}])`)
        .orderBy(desc(invoiceCollectionNotes.createdAt))
      collectionHistory = allNotes
    }

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        code: customer.code,
        creditLimit: customer.creditLimit,
        creditUsed: String(creditUsed),
        creditAvailable: String(creditAvailable),
        overLimit: creditUsed > creditLimit,
      },
      openInvoices: openWithBalance,
      collectionHistory,
    }
  },

  /** Log a system note + send reminder email (email via console in dev) */
  async sendReminder(
    invoiceId: string,
    userId: string
  ) {
    const [inv] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        paidAmount: invoices.paidAmount,
        dueDate: invoices.dueDate,
        customerId: invoices.customerId,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1)
    if (!inv) throw new NotFoundError('invoice')

    const [customer] = await db
      .select({ name: customers.name, email: customers.email })
      .from(customers)
      .where(eq(customers.id, inv.customerId))
      .limit(1)

    const balanceDue = Number(inv.total) - Number(inv.paidAmount)

    // Log system note
    const [note] = await db
      .insert(invoiceCollectionNotes)
      .values({
        invoiceId,
        type: 'system',
        notes: `ส่ง reminder email ถึง ${customer?.name ?? 'ลูกค้า'} ยอดค้างชำระ ฿${balanceDue.toFixed(2)}`,
        createdBy: userId,
      })
      .returning()

    // In production: send email via email service
    console.log(`[REMINDER] Invoice ${inv.invoiceNumber} to ${customer?.email ?? 'no-email'} balance ฿${balanceDue}`)

    return note
  },

  /** Report: overdue invoices without follow-up in N days */
  async collectionGapReport(params: {
    minDaysOverdue?: number
    maxDaysSilent?: number
  }) {
    const minDays = params.minDaysOverdue ?? 1
    const maxSilent = params.maxDaysSilent ?? 7

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - minDays)

    const silentCutoff = new Date()
    silentCutoff.setDate(silentCutoff.getDate() - maxSilent)

    // Overdue invoices with balance
    const overdueInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        dueDate: invoices.dueDate,
        total: invoices.total,
        paidAmount: invoices.paidAmount,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          lte(invoices.dueDate, cutoffDate),
          or(eq(invoices.status, 'overdue'), eq(invoices.status, 'partially_paid'))
        )
      )
      .orderBy(asc(invoices.dueDate))

    // Get last note date per invoice
    const lastNotes = await db
      .select({
        invoiceId: invoiceCollectionNotes.invoiceId,
        lastNote: sql<string>`max(${invoiceCollectionNotes.createdAt})`,
      })
      .from(invoiceCollectionNotes)
      .groupBy(invoiceCollectionNotes.invoiceId)

    const lastNoteMap = new Map(lastNotes.map((n) => [n.invoiceId, new Date(n.lastNote)]))
    const now = new Date()

    return overdueInvoices
      .filter((inv) => {
        const lastNote = lastNoteMap.get(inv.id)
        if (!lastNote) return true  // no notes at all
        return lastNote < silentCutoff  // last note older than threshold
      })
      .map((inv) => {
        const lastNote = lastNoteMap.get(inv.id)
        const balanceDue = Number(inv.total) - Number(inv.paidAmount)
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000
        )
        const daysSilent = lastNote
          ? Math.floor((now.getTime() - lastNote.getTime()) / 86_400_000)
          : null
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerId: inv.customerId,
          dueDate: inv.dueDate.toISOString(),
          balanceDue: String(balanceDue),
          status: inv.status,
          daysOverdue,
          daysSilent,
        }
      })
  },

  /** Daily cron: alert on overdue promise-to-pay */
  async checkOverduePromises(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]!

    const overduePromises = await db
      .select({
        note: invoiceCollectionNotes,
        invoiceBalance: sql<string>`(${invoices.total} - ${invoices.paidAmount})`,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(invoiceCollectionNotes)
      .innerJoin(invoices, eq(invoiceCollectionNotes.invoiceId, invoices.id))
      .where(
        and(
          eq(invoiceCollectionNotes.promisedPayDate, today),
          sql`(${invoices.total} - ${invoices.paidAmount}) > 0`
        )
      )

    for (const row of overduePromises) {
      console.log(
        `[PROMISE-TO-PAY ALERT] Invoice ${row.invoiceNumber} — promised balance ฿${row.invoiceBalance} due today`
      )
    }

    return overduePromises.length
  },
}
