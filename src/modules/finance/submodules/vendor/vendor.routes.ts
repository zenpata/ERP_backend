import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { VendorService } from './vendor.service'

const vendorBody = t.Object({
  code: t.Optional(t.String()),
  name: t.String({ minLength: 1 }),
  taxId: t.Optional(t.String()),
  address: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String()),
  contactName: t.Optional(t.String()),
  bankName: t.Optional(t.String()),
  bankAccountNumber: t.Optional(t.String()),
  bankAccountName: t.Optional(t.String()),
  paymentTermDays: t.Optional(t.Numeric({ minimum: 0 })),
  notes: t.Optional(t.String()),
})

const vendorPatchBody = t.Object({
  name: t.Optional(t.String()),
  taxId: t.Optional(t.Nullable(t.String())),
  address: t.Optional(t.Nullable(t.String())),
  phone: t.Optional(t.Nullable(t.String())),
  email: t.Optional(t.Nullable(t.String())),
  contactName: t.Optional(t.Nullable(t.String())),
  bankName: t.Optional(t.Nullable(t.String())),
  bankAccountNumber: t.Optional(t.Nullable(t.String())),
  bankAccountName: t.Optional(t.Nullable(t.String())),
  paymentTermDays: t.Optional(t.Numeric({ minimum: 0 })),
  notes: t.Optional(t.Nullable(t.String())),
})

export const vendorRoutes = new Elysia({ prefix: '/vendors' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:vendor:view', 'finance:ap:create'))
      .get(
        '/options',
        async ({ query }) => {
          const data = await VendorService.options(query.search)
          return { success: true, data }
        },
        {
          query: t.Object({
            search: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:vendor:view'))
      .get(
        '/',
        async ({ query }) => {
          const q: Parameters<typeof VendorService.list>[0] = {}
          if (query.search !== undefined) q.search = query.search
          if (query.page !== undefined) q.page = Number(query.page)
          if (query.perPage !== undefined) q.perPage = Number(query.perPage)
          if (query.isActive !== undefined) q.isActive = query.isActive
          const result = await VendorService.list(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            search: t.Optional(t.String()),
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            isActive: t.Optional(t.Boolean()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:vendor:view'))
      .get(
        '/:id',
        async ({ params }) => {
          const data = await VendorService.getById(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:vendor:create'))
      .post(
        '/',
        async ({ body, set }) => {
          const data = await VendorService.create({
            ...body,
            paymentTermDays:
              body.paymentTermDays !== undefined ? Number(body.paymentTermDays) : undefined,
          })
          set.status = 201
          return { success: true, data }
        },
        { body: vendorBody }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:vendor:edit'))
      .patch(
        '/:id',
        async ({ params, body }) => {
          const data = await VendorService.update(params.id, {
            ...body,
            paymentTermDays:
              body.paymentTermDays !== undefined ? Number(body.paymentTermDays) : undefined,
          })
          return { success: true, data }
        },
        {
          params: t.Object({ id: t.String() }),
          body: vendorPatchBody,
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:vendor:activate'))
      .patch(
        '/:id/activate',
        async ({ params, body }) => {
          const data = await VendorService.activate(params.id, body.isActive)
          return {
            success: true,
            data: { id: data.id, isActive: data.isActive },
            meta: data.meta,
          }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({ isActive: t.Boolean() }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:vendor:delete'))
      .delete(
        '/:id',
        async ({ params }) => {
          await VendorService.remove(params.id)
          return { success: true, data: null }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
