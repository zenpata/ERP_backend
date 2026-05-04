import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import type { AuthContextUser } from '../../../../shared/middleware/auth.middleware'
import { CollectionService } from './collection.service'

// ============================================================
// collection.routes.ts — AR Collection Workflow (R3-03)
// prefix: mounted under /api/finance
// ============================================================

export const collectionRoutes = new Elysia()
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:view', 'finance:account:view'))
      // GET /invoices/:id/collection-notes
      .get(
        '/invoices/:id/collection-notes',
        async ({ params }) => {
          const data = await CollectionService.listNotes(params.id)
          return { success: true, data }
        }
      )
      // GET /customers/:id/ar-summary
      .get(
        '/customers/:id/ar-summary',
        async ({ params }) => {
          const data = await CollectionService.customerArSummary(params.id)
          return { success: true, data }
        }
      )
      // GET /reports/collection-gap
      .get(
        '/reports/collection-gap',
        async ({ query }) => {
          const params: { minDaysOverdue?: number; maxDaysSilent?: number } = {}
          if (query.minDaysOverdue !== undefined) params.minDaysOverdue = Number(query.minDaysOverdue)
          if (query.maxDaysSilent !== undefined) params.maxDaysSilent = Number(query.maxDaysSilent)
          const data = await CollectionService.collectionGapReport(params)
          return { success: true, data }
        },
        {
          query: t.Object({
            minDaysOverdue: t.Optional(t.Numeric({ minimum: 0 })),
            maxDaysSilent: t.Optional(t.Numeric({ minimum: 0 })),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:create', 'finance:invoice:view'))
      // POST /invoices/:id/collection-notes
      .post(
        '/invoices/:id/collection-notes',
        async (ctx) => {
          const { user } = ctx as typeof ctx & { user: AuthContextUser }
          const data = await CollectionService.addNote(ctx.params.id, {
            type: ctx.body.type,
            notes: ctx.body.notes,
            promisedPayDate: ctx.body.promisedPayDate,
            promisedAmount: ctx.body.promisedAmount,
            createdBy: user.userId,
          })
          return { success: true, data }
        },
        {
          body: t.Object({
            type: t.String({ minLength: 1 }),
            notes: t.String({ minLength: 1 }),
            promisedPayDate: t.Optional(t.String()),
            promisedAmount: t.Optional(t.Numeric({ minimum: 0 })),
          }),
        }
      )
      // POST /invoices/:id/send-reminder
      .post(
        '/invoices/:id/send-reminder',
        async (ctx) => {
          const { user } = ctx as typeof ctx & { user: AuthContextUser }
          const data = await CollectionService.sendReminder(ctx.params.id, user.userId)
          return { success: true, data }
        }
      )
  )
