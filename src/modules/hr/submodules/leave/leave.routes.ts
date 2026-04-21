import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../../../shared/middleware/auth.middleware'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { LeaveService } from './leave.service'

export const leaveRoutes = new Elysia({ prefix: '/leaves' })
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:leave:view', 'hr:leave:view_self'))
      .get('/types', async () => {
        const data = await LeaveService.listTypes()
        return { success: true, data }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:leave:view', 'hr:leave:view_self'))
      .get(
        '/',
        async ({ query, user }) => {
          const u = user as AuthContextUser
          const listQuery: Parameters<typeof LeaveService.list>[1] = {}
          if (query.page !== undefined) listQuery.page = Number(query.page)
          if (query.perPage !== undefined) listQuery.perPage = Number(query.perPage)
          if (query.status !== undefined) listQuery.status = query.status
          if (query.employeeId !== undefined) listQuery.employeeId = query.employeeId
          const result = await LeaveService.list(u.userId, listQuery)
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            status: t.Optional(t.String()),
            employeeId: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:leave:create'))
      .post(
        '/',
        async ({ body, user }) => {
          const u = user as AuthContextUser
          const data = await LeaveService.create(u.userId, body)
          return { success: true, data }
        },
        {
          body: t.Object({
            leaveTypeId: t.String({ minLength: 1 }),
            startDate: t.String({ format: 'date' }),
            endDate: t.String({ format: 'date' }),
            reason: t.Optional(t.String()),
            documentUrl: t.Optional(t.String()),
            employeeId: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:leave:approve'))
      .patch(
        '/:id/approve',
        async ({ params, user }) => {
          const u = user as AuthContextUser
          const data = await LeaveService.approve(u.userId, params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:leave:approve'))
      .patch(
        '/:id/reject',
        async ({ params, body, user }) => {
          const u = user as AuthContextUser
          const data = await LeaveService.reject(u.userId, params.id, body.rejectionReason)
          return { success: true, data }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            rejectionReason: t.String({ minLength: 1 }),
          }),
        }
      )
  )
