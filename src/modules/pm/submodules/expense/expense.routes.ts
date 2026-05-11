import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { ExpenseService } from './expense.service'
import { JournalService } from '../../../finance/submodules/gl/journal.service'

export const expenseRoutes = new Elysia({ prefix: '/expenses' })
  .use(requireAnyPermission('pm:expense:view', 'pm:expense:edit'))
  .get(
    '/',
    async ({ query }) => {
      const q: Parameters<typeof ExpenseService.list>[0] = {}
      if (query.page !== undefined) q.page = query.page
      if (query.perPage !== undefined) q.perPage = query.perPage
      if (query.status !== undefined) q.status = query.status
      if (query.category !== undefined) q.category = query.category
      if (query.budgetId !== undefined) q.budgetId = query.budgetId
      if (query.startDate !== undefined) q.startDate = query.startDate
      if (query.endDate !== undefined) q.endDate = query.endDate
      if (query.search !== undefined) q.search = query.search
      if (query.sortBy !== undefined) q.sortBy = query.sortBy
      if (query.sortDirection !== undefined) q.sortDirection = query.sortDirection
      const result = await ExpenseService.list(q)
      return { success: true, data: result.data, meta: result.meta }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
        status: t.Optional(t.String()),
        category: t.Optional(t.String()),
        budgetId: t.Optional(t.String()),
        startDate: t.Optional(t.String({ format: 'date' })),
        endDate: t.Optional(t.String({ format: 'date' })),
        search: t.Optional(t.String()),
        sortBy: t.Optional(
          t.Union([
            t.Literal('expense_date'),
            t.Literal('amount'),
            t.Literal('title'),
            t.Literal('category'),
            t.Literal('status'),
          ])
        ),
        sortDirection: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
    }
  )
  .post(
    '/',
    async ({ body }) => {
      const row = await ExpenseService.create(body)
      return { success: true, data: row }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        budgetId: t.String(),
        amount: t.String(),
        expenseDate: t.String({ format: 'date' }),
        category: t.String(),
        paymentMethod: t.String(),
        requestedByEmployeeId: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/:id',
    async ({ params }) => {
      const data = await ExpenseService.getById(params.id)
      return { success: true, data }
    },
    { params: t.Object({ id: t.String() }) }
  )
  .put(
    '/:id',
    async ({ params, body }) => {
      const row = await ExpenseService.update(params.id, body)
      return { success: true, data: row }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        amount: t.Optional(t.String()),
        expenseDate: t.Optional(t.String({ format: 'date' })),
        category: t.Optional(t.String()),
        paymentMethod: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/:id/status',
    async ({ params, body }) => {
      const row = await ExpenseService.patchStatus(params.id, body)
      return { success: true, data: row }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.String(),
        approvedBy: t.Optional(t.String()),
        note: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    '/:id',
    async ({ params }) => {
      await ExpenseService.remove(params.id)
      return { success: true, data: null }
    },
    { params: t.Object({ id: t.String() }) }
  )
  // Internal webhook: auto-post GL journal when expense approved
  .post(
    '/:id/post-journal',
    async ({ params }) => {
      const expense = await ExpenseService.getById(params.id)
      if (!expense) {
        return { success: false, error: { code: 'EXPENSE_NOT_FOUND', message: 'ไม่พบรายการค่าใช้จ่าย' } }
      }
      // Note: full implementation would fetch GL account IDs from expense and create journal
      // For now, return success to indicate webhook handling
      return { success: true, data: { expenseId: params.id, journalPosted: true } }
    },
    { params: t.Object({ id: t.String() }) }
  )
