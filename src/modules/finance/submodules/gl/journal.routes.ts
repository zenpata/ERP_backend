import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { NotFoundError } from '../../../../shared/middleware/error.middleware'
import type { AuthContextUser } from '../../../../shared/middleware/auth.middleware'
import { JournalService } from './journal.service'

// ============================================================
// journal.routes.ts — Journal Entry API (R3-01)
// prefix: /journal-entries (under /api/finance)
// ============================================================

const lineBody = t.Object({
  accountId: t.String({ minLength: 1 }),
  debit: t.Numeric({ minimum: 0 }),
  credit: t.Numeric({ minimum: 0 }),
  description: t.Optional(t.String()),
})

export const journalRoutes = new Elysia({ prefix: '/journal-entries' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:journal:view', 'finance:account:view'))
      .get(
        '/',
        async ({ query }) => {
          const result = await JournalService.list({
            page: query.page !== undefined ? Number(query.page) : 1,
            perPage: query.perPage !== undefined ? Number(query.perPage) : 20,
            status: query.status,
            source: query.source,
            dateFrom: query.dateFrom,
            dateTo: query.dateTo,
            search: query.search,
          })
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            status: t.Optional(t.String()),
            source: t.Optional(t.String()),
            dateFrom: t.Optional(t.String()),
            dateTo: t.Optional(t.String()),
            search: t.Optional(t.String()),
          }),
        }
      )
      .get('/:id', async ({ params }) => {
        const row = await JournalService.getById(params.id)
        if (!row) throw new NotFoundError('journal entry')
        return { success: true, data: row }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:journal:create'))
      // R3-01: Create draft
      .post(
        '/',
        async (ctx) => {
          const { user } = ctx as typeof ctx & { user: AuthContextUser }
          const { body } = ctx
          const data = await JournalService.createDraft({
            date: body.date,
            description: body.description,
            referenceNo: body.referenceNo,
            lines: body.lines.map(
              (l: { accountId: string; debit: number; credit: number; description?: string }) => ({
                accountId: l.accountId,
                debit: l.debit,
                credit: l.credit,
                description: l.description,
              })
            ),
            createdBy: user.userId,
          })
          return { success: true, data }
        },
        {
          body: t.Object({
            date: t.String({ minLength: 1 }),
            description: t.String({ minLength: 1 }),
            referenceNo: t.Optional(t.String()),
            lines: t.Array(lineBody, { minItems: 2 }),
          }),
        }
      )
      // R3-01: Update draft
      .patch(
        '/:id',
        async ({ params, body }) => {
          const data = await JournalService.updateDraft(params.id, {
            date: body.date,
            description: body.description,
            referenceNo: body.referenceNo,
            lines: body.lines?.map(
              (l: { accountId: string; debit: number; credit: number; description?: string }) => ({
                accountId: l.accountId,
                debit: l.debit,
                credit: l.credit,
                description: l.description,
              })
            ),
          })
          return { success: true, data }
        },
        {
          body: t.Object({
            date: t.Optional(t.String()),
            description: t.Optional(t.String()),
            referenceNo: t.Optional(t.String()),
            lines: t.Optional(t.Array(lineBody, { minItems: 2 })),
          }),
        }
      )
      // R3-01: Post a draft
      .post(
        '/:id/post',
        async (ctx) => {
          const { user } = ctx as typeof ctx & { user: AuthContextUser }
          const data = await JournalService.postEntry(ctx.params.id, user.userId)
          return { success: true, data }
        }
      )
      // R3-01: Reverse a posted manual journal
      .post(
        '/:id/reverse',
        async (ctx) => {
          const { user } = ctx as typeof ctx & { user: AuthContextUser }
          const data = await JournalService.reverseEntry(
            ctx.params.id,
            ctx.body.reverseDate,
            user.userId,
            ctx.body.description
          )
          return { success: true, data }
        },
        {
          body: t.Object({
            reverseDate: t.String({ minLength: 1 }),
            description: t.Optional(t.String()),
          }),
        }
      )
  )
