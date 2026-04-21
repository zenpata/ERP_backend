import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { ReportsService } from './reports.service'

export const reportsRoutes = new Elysia({ prefix: '/reports' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:report:view'))
      .get(
        '/summary',
        async ({ query }) => {
          const q: Parameters<typeof ReportsService.summary>[0] = {}
          if (query.dateFrom !== undefined) q.dateFrom = query.dateFrom
          if (query.dateTo !== undefined) q.dateTo = query.dateTo
          if (query.period !== undefined) q.period = query.period
          const data = await ReportsService.summary(q)
          return { success: true, data }
        },
        {
          query: t.Object({
            dateFrom: t.Optional(t.String()),
            dateTo: t.Optional(t.String()),
            period: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:report:view'))
      .get(
        '/ar-aging',
        async ({ query }) => {
          const q: Parameters<typeof ReportsService.arAging>[0] = {}
          if (query.asOf !== undefined) q.asOf = query.asOf
          if (query.customerId !== undefined) q.customerId = query.customerId
          const data = await ReportsService.arAging(q)
          return { success: true, data }
        },
        {
          query: t.Object({
            asOf: t.Optional(t.String()),
            customerId: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:report:view'))
      .get(
        '/profit-loss',
        async ({ query }) => {
          const data = await ReportsService.profitLoss({
            dateFrom: query.dateFrom,
            dateTo: query.dateTo,
          })
          return { success: true, data }
        },
        {
          query: t.Object({
            dateFrom: t.String({ format: 'date' }),
            dateTo: t.String({ format: 'date' }),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:report:view'))
      .get(
        '/balance-sheet',
        async ({ query }) => {
          const data = await ReportsService.balanceSheet({ asOf: query.asOf })
          return { success: true, data }
        },
        {
          query: t.Object({
            asOf: t.String({ format: 'date' }),
          }),
        }
      )
  )
