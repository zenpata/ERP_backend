import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { DepartmentService } from './department.service'

export const departmentRoutes = new Elysia({ prefix: '/departments' })
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:department:view'))
      .get(
        '/',
        async ({ query }) => {
          const result = await DepartmentService.list({
            page: query.page,
            perPage: query.perPage,
            search: query.search,
            parentId: query.parentId,
          })
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            search: t.Optional(t.String()),
            parentId: t.Optional(t.String()),
          }),
        }
      )
      .get(
        '/:id',
        async ({ params }) => {
          const data = await DepartmentService.getById(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:department:edit'))
      .post(
        '/',
        async ({ body }) => {
          const row = await DepartmentService.create(body)
          return { success: true, data: row }
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            description: t.Optional(t.String()),
            parentId: t.Optional(t.String()),
            managerId: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:department:edit'))
      .patch(
        '/:id',
        async ({ params, body }) => {
          const row = await DepartmentService.update(params.id, body)
          return { success: true, data: row }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            name: t.Optional(t.String({ minLength: 1 })),
            description: t.Optional(t.Union([t.String(), t.Null()])),
            parentId: t.Optional(t.Union([t.String(), t.Null()])),
            managerId: t.Optional(t.Union([t.String(), t.Null()])),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:department:edit'))
      .delete(
        '/:id',
        async ({ params }) => {
          await DepartmentService.remove(params.id)
          return { success: true, data: null, message: 'Department deleted successfully' }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
