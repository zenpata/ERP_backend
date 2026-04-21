import { Elysia, t } from 'elysia'
import { AppError } from '../../../../shared/middleware/error.middleware'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { QuotationService } from './quotation.service'

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

export const quotationRoutes = new Elysia({ prefix: '/quotations' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:quotation:view'))
      .get(
        '/',
        async ({ query }) => {
          const q: Parameters<typeof QuotationService.list>[0] = {}
          if (query.page !== undefined) q.page = query.page
          if (query.limit !== undefined) q.limit = query.limit
          if (query.perPage !== undefined) q.perPage = query.perPage
          if (query.search !== undefined) q.search = query.search
          if (query.status !== undefined) q.status = query.status
          if (query.customerId !== undefined) q.customerId = query.customerId
          const result = await QuotationService.list(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        { query: listQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:quotation:create'))
      .post(
        '/',
        async ({ body, user, set }) => {
          const data = await QuotationService.create(
            {
              customerId: body.customerId,
              issueDate: body.issueDate,
              validUntil: body.validUntil,
              notes: body.notes,
              termsAndConditions: body.termsAndConditions,
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
            issueDate: t.String({ minLength: 1 }),
            validUntil: t.String({ minLength: 1 }),
            notes: t.Optional(t.String()),
            termsAndConditions: t.Optional(t.String()),
            items: t.Array(itemSchema, { minItems: 1 }),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:quotation:view'))
      .get(
        '/:id/pdf',
        () => {
          throw new AppError('NOT_IMPLEMENTED', 'Quotation PDF export is not available yet', 501)
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:quotation:view'))
      .get(
        '/:id',
        async ({ params }) => {
          const data = await QuotationService.getById(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:quotation:edit'))
      .patch(
        '/:id/status',
        async ({ params, body }) => {
          const data = await QuotationService.updateStatus(params.id, body.status)
          return { success: true, data, message: 'Status updated' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            status: t.Union([
              t.Literal('sent'),
              t.Literal('accepted'),
              t.Literal('rejected'),
            ]),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:quotation:convert'))
      .post(
        '/:id/convert-to-so',
        async ({ params, user, set }) => {
          const data = await QuotationService.convertToSo(params.id, user.userId)
          set.status = 201
          return { success: true, data, message: 'Converted' }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:quotation:edit'))
      .patch(
        '/:id',
        async ({ params, body }) => {
          const payload: Parameters<typeof QuotationService.update>[1] = {}
          if (body.customerId !== undefined) payload.customerId = body.customerId
          if (body.issueDate !== undefined) payload.issueDate = body.issueDate
          if (body.validUntil !== undefined) payload.validUntil = body.validUntil
          if (body.notes !== undefined) payload.notes = body.notes
          if (body.termsAndConditions !== undefined) payload.termsAndConditions = body.termsAndConditions
          if (body.items !== undefined) {
            payload.items = body.items.map(
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
            )
          }
          const data = await QuotationService.update(params.id, payload)
          return { success: true, data, message: 'Updated' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            customerId: t.Optional(t.String()),
            issueDate: t.Optional(t.String()),
            validUntil: t.Optional(t.String()),
            notes: t.Optional(t.String()),
            termsAndConditions: t.Optional(t.String()),
            items: t.Optional(t.Array(itemSchema, { minItems: 1 })),
          }),
        }
      )
  )
