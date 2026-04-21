import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { SalesOrderService } from './sales-order.service'

const itemSchema = t.Object({
  description: t.String({ minLength: 1 }),
  quantity: t.Numeric({ minimum: 0 }),
  unitPrice: t.Numeric({ minimum: 0 }),
  vatRate: t.Optional(t.Numeric({ minimum: 0, maximum: 100 })),
})

const listQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  search: t.Optional(t.String()),
  status: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
})

export const salesOrderRoutes = new Elysia({ prefix: '/sales-orders' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:sales_order:view'))
      .get(
        '/',
        async ({ query }) => {
          const q: Parameters<typeof SalesOrderService.list>[0] = {}
          if (query.page !== undefined) q.page = query.page
          if (query.limit !== undefined) q.limit = query.limit
          if (query.perPage !== undefined) q.perPage = query.perPage
          if (query.search !== undefined) q.search = query.search
          if (query.status !== undefined) q.status = query.status
          if (query.customerId !== undefined) q.customerId = query.customerId
          const result = await SalesOrderService.list(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        { query: listQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:sales_order:create'))
      .post(
        '/',
        async ({ body, user, set }) => {
          const data = await SalesOrderService.create(
            {
              customerId: body.customerId,
              orderDate: body.orderDate,
              deliveryDate: body.deliveryDate,
              notes: body.notes,
              items: body.items.map(
                (i: {
                  description: string
                  quantity: number
                  unitPrice: number
                  vatRate?: number
                }) => ({
                  description: i.description,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                  vatRate: i.vatRate,
                })
              ),
            },
            user.userId
          )
          set.status = 201
          return { success: true, data, message: 'Created' }
        },
        {
          body: t.Object({
            customerId: t.String({ minLength: 1 }),
            orderDate: t.String({ minLength: 1 }),
            deliveryDate: t.Optional(t.String()),
            notes: t.Optional(t.String()),
            items: t.Array(itemSchema, { minItems: 1 }),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:sales_order:view'))
      .get(
        '/:id',
        async ({ params }) => {
          const data = await SalesOrderService.getById(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:sales_order:edit'))
      .patch(
        '/:id/status',
        async ({ params, body }) => {
          const data = await SalesOrderService.updateStatus(params.id, body.status)
          return { success: true, data, message: 'Status updated' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            status: t.Union([t.Literal('confirmed'), t.Literal('cancelled')]),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:create'))
      .post(
        '/:id/convert-to-invoice',
        async ({ params, set }) => {
          const data = await SalesOrderService.convertToInvoice(params.id)
          set.status = 201
          return { success: true, data, message: 'Converted' }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
