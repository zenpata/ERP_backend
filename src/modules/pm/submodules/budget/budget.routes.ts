import { Elysia, t } from 'elysia'
import { BudgetService } from './budget.service'

export const budgetRoutes = new Elysia({ prefix: '/budgets' }).get(
    '/',
    async ({ query }) => {
      const q: Parameters<typeof BudgetService.list>[0] = {}
      if (query.page !== undefined) q.page = query.page
      if (query.perPage !== undefined) q.perPage = query.perPage
      if (query.status !== undefined) q.status = query.status
      if (query.module !== undefined) q.module = query.module
      if (query.search !== undefined) q.search = query.search
      const result = await BudgetService.list(q)
      return { success: true, data: result.data, meta: result.meta }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
        status: t.Optional(t.String()),
        module: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/',
    async ({ body }) => {
      const row = await BudgetService.create(body)
      return { success: true, data: row }
    },
    {
      body: t.Object({
        projectName: t.String({ minLength: 1 }),
        totalAmount: t.String(),
        budgetType: t.String(),
        moduleTags: t.Array(t.String()),
        ownerName: t.String(),
        startDate: t.String({ format: 'date' }),
        endDate: t.String({ format: 'date' }),
      }),
    }
  )
  .get(
    '/:id/summary',
    async ({ params }) => {
      const data = await BudgetService.summary(params.id)
      return { success: true, data }
    },
    { params: t.Object({ id: t.String() }) }
  )
  .get(
    '/:id',
    async ({ params }) => {
      const data = await BudgetService.getById(params.id)
      return { success: true, data }
    },
    { params: t.Object({ id: t.String() }) }
  )
  .put(
    '/:id',
    async ({ params, body }) => {
      const row = await BudgetService.update(params.id, body)
      return { success: true, data: row }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        projectName: t.Optional(t.String()),
        totalAmount: t.Optional(t.String()),
        budgetType: t.Optional(t.String()),
        moduleTags: t.Optional(t.Array(t.String())),
        ownerName: t.Optional(t.String()),
        startDate: t.Optional(t.String({ format: 'date' })),
        endDate: t.Optional(t.String({ format: 'date' })),
      }),
    }
  )
  .patch(
    '/:id/status',
    async ({ params, body }) => {
      const row = await BudgetService.patchStatus(params.id, body.status, body.note)
      return { success: true, data: row }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.String(),
        note: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    '/:id',
    async ({ params }) => {
      await BudgetService.remove(params.id)
      return { success: true, data: null }
    },
    { params: t.Object({ id: t.String() }) }
  )
