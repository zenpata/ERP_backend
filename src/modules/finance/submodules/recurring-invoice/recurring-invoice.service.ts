import { and, eq, isNull, lte, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import {
  invoices,
  recurringInvoiceTemplates,
  recurringInvoiceRuns,
  customers,
} from '../../finance.schema'

// ============================================================
// recurring-invoice.service.ts — Recurring Invoice (R3-02)
// ============================================================

export type ListRecurringQuery = {
  page?: number
  perPage?: number
  status?: string
  customerId?: string
  search?: string
}

export const RecurringInvoiceService = {
  async list(query: ListRecurringQuery = {}) {
    const page = query.page ?? 1
    const perPage = query.perPage ?? 20
    const offset = (page - 1) * perPage

    const where = and(
      isNull(recurringInvoiceTemplates.deletedAt),
      query.status ? eq(recurringInvoiceTemplates.status, query.status) : undefined,
      query.customerId ? eq(recurringInvoiceTemplates.customerId, query.customerId) : undefined,
      query.search
        ? sql`(${recurringInvoiceTemplates.name} ILIKE ${'%' + query.search + '%'} OR ${customers.name} ILIKE ${'%' + query.search + '%'})`
        : undefined
    )

    const [items, countRows] = await Promise.all([
      db
        .select({
          id: recurringInvoiceTemplates.id,
          name: recurringInvoiceTemplates.name,
          customerId: recurringInvoiceTemplates.customerId,
          customerName: customers.name,
          frequency: recurringInvoiceTemplates.frequency,
          status: recurringInvoiceTemplates.status,
          nextRunDate: recurringInvoiceTemplates.nextRunDate,
          createdAt: recurringInvoiceTemplates.createdAt,
        })
        .from(recurringInvoiceTemplates)
        .leftJoin(customers, eq(recurringInvoiceTemplates.customerId, customers.id))
        .where(where)
        .orderBy(sql`${recurringInvoiceTemplates.createdAt} DESC`)
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(recurringInvoiceTemplates)
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

  async getById(id: string) {
    const [template] = await db
      .select()
      .from(recurringInvoiceTemplates)
      .where(and(eq(recurringInvoiceTemplates.id, id), isNull(recurringInvoiceTemplates.deletedAt)))
      .limit(1)

    if (!template) throw new NotFoundError('recurring invoice template')

    const runs = await db
      .select()
      .from(recurringInvoiceRuns)
      .where(eq(recurringInvoiceRuns.templateId, id))
      .orderBy(sql`${recurringInvoiceRuns.createdAt} DESC`)
      .limit(10)

    return { template, runs }
  },

  async create(input: {
    name: string
    customerId: string
    frequency: string
    nextRunDate: string
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      vatRate?: number
      whtRate?: number
    }>
    notes?: string
  }) {
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, input.customerId), isNull(customers.deletedAt)))
      .limit(1)

    if (!customer) throw new NotFoundError('customer')

    if (!input.name.trim()) {
      throw new ValidationError({ name: ['Template name is required'] })
    }

    if (input.items.length === 0) {
      throw new ValidationError({ items: ['At least one item is required'] })
    }

    const [template] = await db
      .insert(recurringInvoiceTemplates)
      .values({
        name: input.name.trim(),
        customerId: input.customerId,
        frequency: input.frequency,
        startDate: input.nextRunDate,
        nextRunDate: input.nextRunDate,
        status: 'active',
        items: input.items,
        notes: input.notes || null,
      })
      .returning()

    return template
  },

  async update(
    id: string,
    input: {
      name?: string
      frequency?: string
      nextRunDate?: string
      items?: Array<{
        description: string
        quantity: number
        unitPrice: number
        vatRate?: number
        whtRate?: number
      }>
      notes?: string
    }
  ) {
    const [existing] = await db
      .select()
      .from(recurringInvoiceTemplates)
      .where(and(eq(recurringInvoiceTemplates.id, id), isNull(recurringInvoiceTemplates.deletedAt)))
      .limit(1)

    if (!existing) throw new NotFoundError('recurring invoice template')

    const [updated] = await db
      .update(recurringInvoiceTemplates)
      .set({
        name: input.name?.trim() ?? existing.name,
        frequency: input.frequency ?? existing.frequency,
        nextRunDate: input.nextRunDate ?? existing.nextRunDate,
        items: input.items ?? existing.items,
        notes: input.notes !== undefined ? input.notes || null : existing.notes,
      })
      .where(eq(recurringInvoiceTemplates.id, id))
      .returning()

    return updated
  },

  async pause(id: string) {
    const [template] = await db
      .select()
      .from(recurringInvoiceTemplates)
      .where(and(eq(recurringInvoiceTemplates.id, id), isNull(recurringInvoiceTemplates.deletedAt)))
      .limit(1)

    if (!template) throw new NotFoundError('recurring invoice template')

    const [updated] = await db
      .update(recurringInvoiceTemplates)
      .set({ status: 'paused' })
      .where(eq(recurringInvoiceTemplates.id, id))
      .returning()

    return updated
  },

  async resume(id: string) {
    const [template] = await db
      .select()
      .from(recurringInvoiceTemplates)
      .where(and(eq(recurringInvoiceTemplates.id, id), isNull(recurringInvoiceTemplates.deletedAt)))
      .limit(1)

    if (!template) throw new NotFoundError('recurring invoice template')

    const [updated] = await db
      .update(recurringInvoiceTemplates)
      .set({ status: 'active' })
      .where(eq(recurringInvoiceTemplates.id, id))
      .returning()

    return updated
  },

  async cancel(id: string) {
    const [template] = await db
      .select()
      .from(recurringInvoiceTemplates)
      .where(and(eq(recurringInvoiceTemplates.id, id), isNull(recurringInvoiceTemplates.deletedAt)))
      .limit(1)

    if (!template) throw new NotFoundError('recurring invoice template')

    const [updated] = await db
      .update(recurringInvoiceTemplates)
      .set({ status: 'cancelled', deletedAt: new Date() })
      .where(eq(recurringInvoiceTemplates.id, id))
      .returning()

    return updated
  },

  async getHistory(templateId: string) {
    const [template] = await db
      .select()
      .from(recurringInvoiceTemplates)
      .where(eq(recurringInvoiceTemplates.id, templateId))
      .limit(1)

    if (!template) throw new NotFoundError('recurring invoice template')

    return db
      .select()
      .from(recurringInvoiceRuns)
      .where(eq(recurringInvoiceRuns.templateId, templateId))
      .orderBy(sql`${recurringInvoiceRuns.createdAt} DESC`)
  },

  async runDailyJob(): Promise<number> {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0] ?? tomorrow.toISOString()

    // Find templates due today
    const dueTemplates = await db
      .select()
      .from(recurringInvoiceTemplates)
      .where(
        and(
          eq(recurringInvoiceTemplates.status, 'active'),
          lte(recurringInvoiceTemplates.nextRunDate, tomorrowStr),
          isNull(recurringInvoiceTemplates.deletedAt)
        )
      )

    let createdCount = 0

    for (const template of dueTemplates) {
      // Create draft invoice from template
      const items = (template.items ?? []) as Array<{
        description: string
        quantity: number
        unitPrice: number
        vatRate?: number
        whtRate?: number
      }>

      // Calculate subtotal, VAT, etc. (similar to invoice creation)
      let subtotal = 0
      items.forEach((item) => {
        subtotal += item.quantity * item.unitPrice
      })

      const vatAmount = subtotal * 0.07 // 7% VAT
      const total = subtotal + vatAmount

      const [invoice] = await db
        .insert(invoices)
        .values({
          customerId: template.customerId,
          invoiceNumber: '', // will be set by trigger/advisor
          issueDate: today,
          dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days default
          subtotal: String(subtotal),
          vatAmount: String(vatAmount),
          total: String(total),
          paidAmount: '0',
          status: 'draft',
          source: 'recurring',
          recurringTemplateId: template.id,
          note: template.notes,
        })
        .returning()

      if (invoice) {
        createdCount++

        // Record the run
        await db.insert(recurringInvoiceRuns).values({
          templateId: template.id,
          invoiceId: invoice.id,
          generatedAt: today,
          status: 'generated',
        })

        // Calculate next run date based on frequency
        const nextDate = this.calculateNextRunDate(today, template.frequency)
        const nextDateStr = nextDate.toISOString().split('T')[0] ?? nextDate.toISOString()
        await db
          .update(recurringInvoiceTemplates)
          .set({ nextRunDate: nextDateStr })
          .where(eq(recurringInvoiceTemplates.id, template.id))
      }
    }

    return createdCount
  },

  calculateNextRunDate(fromDate: Date, frequency: string): Date {
    const next = new Date(fromDate)

    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7)
        break
      case 'monthly':
        next.setMonth(next.getMonth() + 1)
        break
      case 'quarterly':
        next.setMonth(next.getMonth() + 3)
        break
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1)
        break
      default:
        next.setDate(next.getDate() + 30)
    }

    return next
  },
}
