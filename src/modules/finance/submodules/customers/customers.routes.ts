import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { CustomerService } from './customers.service'

const customerBody = t.Object({
  code: t.Optional(t.String()),
  name: t.String({ minLength: 1 }),
  taxId: t.Optional(t.String()),
  address: t.Optional(t.String()),
  contactName: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String()),
  creditLimit: t.Optional(t.String()),
  creditTermDays: t.Optional(t.Numeric({ minimum: 0 })),
  notes: t.Optional(t.String()),
})

const customerPatchBody = t.Object({
  name: t.Optional(t.String()),
  taxId: t.Optional(t.Nullable(t.String())),
  address: t.Optional(t.Nullable(t.String())),
  contactName: t.Optional(t.Nullable(t.String())),
  phone: t.Optional(t.Nullable(t.String())),
  email: t.Optional(t.Nullable(t.String())),
  creditLimit: t.Optional(t.Nullable(t.String())),
  creditTermDays: t.Optional(t.Numeric({ minimum: 0 })),
  notes: t.Optional(t.Nullable(t.String())),
})

const listQuery = t.Object({
  search: t.Optional(t.String()),
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  isActive: t.Optional(t.Boolean()),
})

const optionsQuery = t.Object({
  search: t.Optional(t.String()),
  activeOnly: t.Optional(t.Boolean()),
})

export const customersRoutes = new Elysia({ prefix: '/customers' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:customer:view', 'finance:invoice:create'))
      .get(
        '/options',
        async ({ query }) => {
          const data = await CustomerService.options({
            search: query.search,
            activeOnly: query.activeOnly,
          })
          return { success: true, data }
        },
        { query: optionsQuery }
      )
  )
  .use(
    new Elysia().use(requireAnyPermission('finance:customer:view')).get(
      '/',
      async ({ query }) => {
        const q: Parameters<typeof CustomerService.list>[0] = {}
        if (query.search !== undefined) q.search = query.search
        if (query.page !== undefined) q.page = Number(query.page)
        if (query.limit !== undefined) q.limit = Number(query.limit)
        if (query.perPage !== undefined) q.perPage = Number(query.perPage)
        if (query.isActive !== undefined) q.isActive = query.isActive
        const result = await CustomerService.list(q)
        return { success: true, data: result.data, meta: result.meta }
      },
      { query: listQuery }
    )
  )
  .use(
    new Elysia().use(requireAnyPermission('finance:customer:view')).get(
      '/:id',
      async ({ params }) => {
        const data = await CustomerService.getById(params.id)
        return { success: true, data }
      },
      { params: t.Object({ id: t.String() }) }
    )
  )
  .use(
    new Elysia().use(requireAnyPermission('finance:customer:create')).post(
      '/',
      async ({ body, set }) => {
        const data = await CustomerService.create({
          ...body,
          creditTermDays:
            body.creditTermDays !== undefined ? Number(body.creditTermDays) : undefined,
        })
        set.status = 201
        return { success: true, data }
      },
      { body: customerBody }
    )
  )
  .use(
    new Elysia().use(requireAnyPermission('finance:customer:activate')).patch(
      '/:id/activate',
      async ({ params, body }) => {
        const data = await CustomerService.activate(params.id, body.isActive)
        return { success: true, data }
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({ isActive: t.Boolean() }),
      }
    )
  )
  .use(
    new Elysia().use(requireAnyPermission('finance:customer:edit')).patch(
      '/:id',
      async ({ params, body }) => {
        const data = await CustomerService.update(params.id, {
          ...body,
          creditTermDays:
            body.creditTermDays !== undefined ? Number(body.creditTermDays) : undefined,
        })
        return { success: true, data }
      },
      {
        params: t.Object({ id: t.String() }),
        body: customerPatchBody,
      }
    )
  )
  .use(
    new Elysia().use(requireAnyPermission('finance:customer:delete')).delete(
      '/:id',
      async ({ params }) => {
        await CustomerService.remove(params.id)
        return { success: true, data: null, message: 'Deleted successfully' }
      },
      { params: t.Object({ id: t.String() }) }
    )
  )
