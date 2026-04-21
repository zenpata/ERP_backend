import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { PositionService } from './position.service'

export const positionRoutes = new Elysia({ prefix: '/positions' })
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:department:view'))
      .get(
        '/',
        async ({ query }) => {
          const result = await PositionService.list({
            page: query.page,
            perPage: query.perPage,
            search: query.search,
            departmentId: query.departmentId,
          })
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            search: t.Optional(t.String()),
            departmentId: t.Optional(t.String()),
          }),
        }
      )
      .get(
        '/:id',
        async ({ params }) => {
          const data = await PositionService.getById(params.id)
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
          const row = await PositionService.create(body)
          return { success: true, data: row }
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            departmentId: t.Optional(t.String()),
            level: t.Optional(t.Numeric({ minimum: 0 })),
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
          const row = await PositionService.update(params.id, body)
          return { success: true, data: row }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            name: t.Optional(t.String({ minLength: 1 })),
            departmentId: t.Optional(t.Union([t.String(), t.Null()])),
            level: t.Optional(t.Numeric({ minimum: 0 })),
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
          await PositionService.remove(params.id)
          return { success: true, data: null, message: 'Position deleted successfully' }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
