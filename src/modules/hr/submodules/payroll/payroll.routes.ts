import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../../../shared/middleware/auth.middleware'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { PayrollService } from './payroll.service'

export const payrollRoutes = new Elysia({ prefix: '/payroll' })
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:payroll:run'))
      .post(
        '/runs',
        async ({ body }) => {
          const data = await PayrollService.createRun(body.periodMonth, body.periodYear)
          return { success: true, data }
        },
        {
          body: t.Object({
            periodMonth: t.Numeric({ minimum: 1, maximum: 12 }),
            periodYear: t.Numeric({ minimum: 2000, maximum: 3000 }),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:payroll:view'))
      .get('/runs', async () => {
        const result = await PayrollService.listRuns()
        return { success: true, data: result.data, meta: result.meta }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:payroll:run'))
      .post(
        '/runs/:runId/process',
        async ({ params }) => {
          const data = await PayrollService.processRun(params.runId)
          return { success: true, data }
        },
        { params: t.Object({ runId: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:payroll:run'))
      .post(
        '/runs/:runId/approve',
        async (ctx) => {
          const { params, user } = ctx as typeof ctx & {
            params: { runId: string }
            user: AuthContextUser
          }
          const data = await PayrollService.approveRun(params.runId, user.userId)
          return { success: true, data }
        },
        { params: t.Object({ runId: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:payroll:run'))
      .post(
        '/runs/:runId/mark-paid',
        async ({ params }) => {
          const data = await PayrollService.markPaid(params.runId)
          return { success: true, data }
        },
        { params: t.Object({ runId: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:payroll:view'))
      .get(
        '/runs/:runId/payslips',
        async ({ params }) => {
          const data = await PayrollService.getPayslipsByRun(params.runId)
          return { success: true, data }
        },
        { params: t.Object({ runId: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:payroll:view'))
      .get(
        '/',
        async ({ query }) => {
          const q: Parameters<typeof PayrollService.listPayslipsForApi>[0] = {}
          if (query.page !== undefined) q.page = query.page
          if (query.perPage !== undefined) q.perPage = query.perPage
          if (query.period !== undefined) q.period = query.period
          if (query.employeeId !== undefined) q.employeeId = query.employeeId
          const result = await PayrollService.listPayslipsForApi(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            period: t.Optional(t.String()),
            employeeId: t.Optional(t.String()),
          }),
        }
      )
  )
