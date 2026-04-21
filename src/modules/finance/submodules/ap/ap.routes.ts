import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { ApVendorInvoiceService } from './ap-vendor-invoice.service'

const apItemBody = t.Object({
  description: t.String({ minLength: 1 }),
  quantity: t.Numeric({ minimum: 0.0001 }),
  unitPrice: t.Numeric({ minimum: 0.01 }),
  amount: t.Numeric({ minimum: 0.01 }),
  whtType: t.Optional(
    t.Union([
      t.Literal('service'),
      t.Literal('rent'),
      t.Literal('interest'),
      t.Literal('other'),
    ])
  ),
  whtRate: t.Optional(t.Numeric({ minimum: 0, maximum: 100 })),
})

const createBody = t.Object({
  vendorId: t.String({ minLength: 1 }),
  vendorInvoiceNumber: t.Optional(t.String()),
  issueDate: t.String({ format: 'date' }),
  dueDate: t.String({ format: 'date' }),
  receivedDate: t.String({ format: 'date' }),
  subtotal: t.Numeric({ minimum: 0.01 }),
  vatAmount: t.Numeric({ minimum: 0 }),
  whtAmount: t.Numeric({ minimum: 0 }),
  totalAmount: t.Numeric({ minimum: 0.01 }),
  expenseCategory: t.Optional(
    t.Union([
      t.Literal('Equipment'),
      t.Literal('Labor'),
      t.Literal('Service'),
      t.Literal('Software'),
      t.Literal('Office'),
      t.Literal('Other'),
    ])
  ),
  items: t.Array(apItemBody, { minItems: 1 }),
  attachmentUrl: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  poId: t.Optional(t.String()),
})

const statusBody = t.Object({
  action: t.Union([t.Literal('approve'), t.Literal('reject')]),
  reason: t.Optional(t.String()),
})

type ApCreateItemInput = {
  description: string
  quantity: number | string
  unitPrice: number | string
  amount: number | string
  whtType?: 'service' | 'rent' | 'interest' | 'other'
  whtRate?: number | string
}

const paymentBody = t.Object({
  paymentDate: t.String({ format: 'date' }),
  amount: t.Numeric({ minimum: 0.01 }),
  paymentMethod: t.Union([
    t.Literal('transfer'),
    t.Literal('cash'),
    t.Literal('cheque'),
    t.Literal('credit_card'),
  ]),
  reference: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

export const apRoutes = new Elysia({ prefix: '/ap/vendor-invoices' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:ap:view'))
      .get(
        '/',
        async ({ query }) => {
          const q: Parameters<typeof ApVendorInvoiceService.list>[0] = {}
          if (query.page !== undefined) q.page = Number(query.page)
          if (query.perPage !== undefined) q.perPage = Number(query.perPage)
          if (query.search !== undefined) q.search = query.search
          if (query.status !== undefined) q.status = query.status
          if (query.vendorId !== undefined) q.vendorId = query.vendorId
          const result = await ApVendorInvoiceService.list(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            search: t.Optional(t.String()),
            status: t.Optional(
              t.Union([
                t.Literal('pending'),
                t.Literal('approved'),
                t.Literal('paid'),
                t.Literal('overdue'),
                t.Literal('rejected'),
              ])
            ),
            vendorId: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:ap:view'))
      .get(
        '/:id/pdf',
        async ({ params, set }) => {
          const buf = await ApVendorInvoiceService.buildPdfBuffer(params.id)
          set.headers['Content-Type'] = 'application/pdf'
          set.headers['Content-Disposition'] = `attachment; filename="ap-${params.id.slice(0, 8)}.pdf"`
          return buf
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:ap:view'))
      .get(
        '/:id',
        async ({ params }) => {
          const data = await ApVendorInvoiceService.getById(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:ap:create'))
      .post(
        '/',
        async ({ body, set }) => {
          const data = await ApVendorInvoiceService.create({
            vendorId: body.vendorId,
            vendorInvoiceNumber: body.vendorInvoiceNumber,
            issueDate: body.issueDate,
            dueDate: body.dueDate,
            receivedDate: body.receivedDate,
            subtotal: Number(body.subtotal),
            vatAmount: Number(body.vatAmount),
            whtAmount: Number(body.whtAmount),
            totalAmount: Number(body.totalAmount),
            expenseCategory: body.expenseCategory,
            items: body.items.map((it: ApCreateItemInput) => ({
              description: it.description,
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              amount: Number(it.amount),
              ...(it.whtType != null ? { whtType: it.whtType } : {}),
              ...(it.whtRate !== undefined ? { whtRate: Number(it.whtRate) } : {}),
            })),
            attachmentUrl: body.attachmentUrl,
            notes: body.notes,
            poId: body.poId,
          })
          set.status = 201
          return { success: true, data }
        },
        { body: createBody }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:ap:approve'))
      .patch(
        '/:id/status',
        async ({ params, body, user }) => {
          const data = await ApVendorInvoiceService.patchStatus(params.id, body, user.userId)
          return { success: true, data }
        },
        {
          params: t.Object({ id: t.String() }),
          body: statusBody,
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:ap:payment'))
      .post(
        '/:id/payments',
        async ({ params, body }) => {
          const data = await ApVendorInvoiceService.addPayment(params.id, {
            paymentDate: body.paymentDate,
            amount: Number(body.amount),
            paymentMethod: body.paymentMethod,
            reference: body.reference,
            notes: body.notes,
          })
          return { success: true, data }
        },
        {
          params: t.Object({ id: t.String() }),
          body: paymentBody,
        }
      )
  )
