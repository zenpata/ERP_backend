import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { JournalService } from './journal.service'

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
          const page = query.page !== undefined ? Number(query.page) : 1
          const perPage = query.perPage !== undefined ? Number(query.perPage) : 20
          const result = await JournalService.list({ page, perPage })
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          }),
        }
      )
      .get('/:id', async ({ params }) => {
        const row = await JournalService.getById(params.id)
        if (!row) return { success: false, error: { code: 'NOT_FOUND', message: 'Journal entry not found' } }
        return { success: true, data: row }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:journal:create'))
      .post(
        '/',
        async ({ body }) => {
          const data = await JournalService.create({
            date: body.date,
            description: body.description,
            type: body.type,
            lines: body.lines.map(
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
            date: t.String({ minLength: 1 }),
            description: t.String({ minLength: 1 }),
            type: t.Optional(t.String()),
            lines: t.Array(lineBody, { minItems: 2 }),
          }),
        }
      )
  )
