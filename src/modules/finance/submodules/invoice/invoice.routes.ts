import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { InvoiceService } from './invoice.service'

const paymentBody = t.Object({
  paymentDate: t.String({ minLength: 1 }),
  amount: t.Numeric({ minimum: 0.01 }),
  paymentMethod: t.String({ minLength: 1 }),
  bankAccountId: t.Optional(t.String()),
  referenceNo: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const statusBody = t.Object({
  status: t.Union([t.Literal('sent'), t.Literal('cancelled')]),
})

export const invoiceRoutes = new Elysia({ prefix: '/invoices' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:view'))
      .get(
        '/',
        async ({ query }) => {
          const q: Parameters<typeof InvoiceService.list>[0] = {}
          if (query.page !== undefined) q.page = query.page
          if (query.perPage !== undefined) q.perPage = query.perPage
          if (query.search !== undefined) q.search = query.search
          if (query.status !== undefined) q.status = query.status
          if (query.customerId !== undefined) q.customerId = query.customerId
          if (query.dateFrom !== undefined) q.dateFrom = query.dateFrom
          if (query.dateTo !== undefined) q.dateTo = query.dateTo
          const result = await InvoiceService.list(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            search: t.Optional(t.String()),
            status: t.Optional(t.String()),
            customerId: t.Optional(t.String()),
            dateFrom: t.Optional(t.String()),
            dateTo: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:create'))
      .post(
        '/',
        async ({ body, set }) => {
          const payload: Parameters<typeof InvoiceService.create>[0] = {
            customerId: body.customerId,
            dueDate: body.dueDate,
            items: body.items.map(
              (i: {
                description: string
                quantity: number
                unitPrice: number
                vatRate?: number
                whtRate?: number
              }) => {
                const row: {
                  description: string
                  quantity: number
                  unitPrice: number
                  vatRate?: number
                  whtRate?: number
                } = {
                  description: i.description,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                }
                if (i.vatRate !== undefined) row.vatRate = i.vatRate
                if (i.whtRate !== undefined) row.whtRate = i.whtRate
                return row
              }
            ),
          }
          if (body.issueDate !== undefined) payload.issueDate = body.issueDate
          if (body.notes !== undefined) payload.notes = body.notes
          const data = await InvoiceService.create(payload)
          set.status = 201
          return { success: true, data }
        },
        {
          body: t.Object({
            customerId: t.String({ minLength: 1 }),
            issueDate: t.Optional(t.String()),
            dueDate: t.String({ minLength: 1 }),
            notes: t.Optional(t.String()),
            items: t.Array(
              t.Object({
                description: t.String({ minLength: 1 }),
                quantity: t.Numeric({ minimum: 0.0001 }),
                unitPrice: t.Numeric({ minimum: 0 }),
                vatRate: t.Optional(t.Numeric({ minimum: 0, maximum: 100 })),
                whtRate: t.Optional(t.Numeric({ minimum: 0, maximum: 100 })),
              }),
              { minItems: 1 }
            ),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:view'))
      .get(
        '/:id/payments',
        async ({ params }) => {
          const data = await InvoiceService.listPayments(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:payment'))
      .post(
        '/:id/payments',
        async ({ params, body, set }) => {
          const data = await InvoiceService.recordPayment(params.id, {
            paymentDate: body.paymentDate,
            amount: Number(body.amount),
            paymentMethod: body.paymentMethod,
            bankAccountId: body.bankAccountId,
            referenceNo: body.referenceNo,
            notes: body.notes,
          })
          set.status = 201
          return { success: true, data, message: 'Payment recorded' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: paymentBody,
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:edit'))
      .patch(
        '/:id/status',
        async ({ params, body }) => {
          const data = await InvoiceService.updateStatus(params.id, body)
          return { success: true, data, message: 'Success' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: statusBody,
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:view'))
      .get(
        '/:id/pdf',
        async ({ params, set }) => {
          const buf = await InvoiceService.buildPdfBuffer(params.id)
          set.headers['Content-Type'] = 'application/pdf'
          set.headers['Content-Disposition'] = `attachment; filename="invoice-${params.id.slice(0, 8)}.pdf"`
          return buf
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:invoice:view'))
      .get(
        '/:id',
        async ({ params }) => {
          const data = await InvoiceService.getById(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
