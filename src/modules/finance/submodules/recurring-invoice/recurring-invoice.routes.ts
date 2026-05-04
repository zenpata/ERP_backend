import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { NotFoundError } from '../../../../shared/middleware/error.middleware'
import { RecurringInvoiceService } from './recurring-invoice.service'

// ============================================================
// recurring-invoice.routes.ts — Recurring Invoice API (R3-02)
// prefix: mounted under /api/finance
// ============================================================

const itemSchema = t.Object({
  description: t.String({ minLength: 1 }),
  quantity: t.Numeric({ minimum: 0.01 }),
  unitPrice: t.Numeric({ minimum: 0 }),
  vatRate: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
  whtRate: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
})

export const recurringInvoiceRoutes = new Elysia()
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:view', 'finance:account:view'))
      .get(
        '/recurring-invoices',
        async ({ query }) => {
          const result = await RecurringInvoiceService.list({
            page: query.page !== undefined ? Number(query.page) : 1,
            perPage: query.perPage !== undefined ? Number(query.perPage) : 20,
            status: query.status,
            customerId: query.customerId,
            search: query.search,
          })
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            status: t.Optional(t.String()),
            customerId: t.Optional(t.String()),
            search: t.Optional(t.String()),
          }),
        }
      )
      .get(
        '/recurring-invoices/:id',
        async ({ params }) => {
          const data = await RecurringInvoiceService.getById(params.id)
          return { success: true, data }
        }
      )
      .get(
        '/recurring-invoices/:id/history',
        async ({ params }) => {
          const data = await RecurringInvoiceService.getHistory(params.id)
          return { success: true, data }
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:create'))
      .post(
        '/recurring-invoices',
        async ({ body }) => {
          const data = await RecurringInvoiceService.create({
            name: body.name,
            customerId: body.customerId,
            frequency: body.frequency,
            nextRunDate: body.nextRunDate,
            items: body.items,
            notes: body.notes,
          })
          return { success: true, data }
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            customerId: t.String({ minLength: 1 }),
            frequency: t.String({ minLength: 1 }),
            nextRunDate: t.String({ minLength: 1 }),
            items: t.Array(itemSchema, { minItems: 1 }),
            notes: t.Optional(t.String()),
          }),
        }
      )
      .patch(
        '/recurring-invoices/:id',
        async ({ params, body }) => {
          const data = await RecurringInvoiceService.update(params.id, {
            name: body.name,
            frequency: body.frequency,
            nextRunDate: body.nextRunDate,
            items: body.items,
            notes: body.notes,
          })
          return { success: true, data }
        },
        {
          body: t.Object({
            name: t.Optional(t.String()),
            frequency: t.Optional(t.String()),
            nextRunDate: t.Optional(t.String()),
            items: t.Optional(t.Array(itemSchema, { minItems: 1 })),
            notes: t.Optional(t.String()),
          }),
        }
      )
      .post(
        '/recurring-invoices/:id/pause',
        async ({ params }) => {
          const data = await RecurringInvoiceService.pause(params.id)
          return { success: true, data }
        }
      )
      .post(
        '/recurring-invoices/:id/resume',
        async ({ params }) => {
          const data = await RecurringInvoiceService.resume(params.id)
          return { success: true, data }
        }
      )
      .post(
        '/recurring-invoices/:id/cancel',
        async ({ params }) => {
          const data = await RecurringInvoiceService.cancel(params.id)
          return { success: true, data }
        }
      )
  )
