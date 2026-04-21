import { Elysia, t } from 'elysia'
import { eq } from 'drizzle-orm'
import { getPermissionsForUser } from '../../../../modules/auth/auth.service'
import { db } from '../../../../shared/db/client'
import { ForbiddenError, NotFoundError } from '../../../../shared/middleware/error.middleware'
import { requireAnyPermission, ROLES } from '../../../../shared/middleware/rbac.middleware'
import { purchaseOrders } from '../../finance.schema'
import { PurchaseOrderService } from './purchase-order.service'

const poItemSchema = t.Object({
  description: t.String({ minLength: 1 }),
  quantity: t.Numeric({ minimum: 0.0001 }),
  unit: t.Optional(t.String()),
  unitPrice: t.Numeric({ minimum: 0 }),
})

type PoItemBody = {
  description: string
  quantity: number | string
  unit?: string
  unitPrice: number | string
}

type GrLineBody = {
  poItemId: string
  receivedQty: number | string
  notes?: string
}

const listQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  status: t.Optional(t.String()),
  vendorId: t.Optional(t.String()),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
})

async function assertPoStatusChangeAllowed(
  userId: string,
  roles: string[],
  poId: string,
  body: { status: 'submitted' | 'approved' | 'cancelled'; reason?: string }
) {
  const [po] = await db.select({ status: purchaseOrders.status }).from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1)
  if (!po) throw new NotFoundError('purchase order')
  const isSuper = roles.includes(ROLES.SUPER_ADMIN)
  const codes = isSuper ? [] : await getPermissionsForUser(userId)
  const canEdit = isSuper || codes.includes('finance:purchase_order:edit')
  const canApprove = isSuper || codes.includes('finance:purchase_order:approve')
  if (body.status === 'submitted') {
    if (!canEdit) throw new ForbiddenError()
  } else if (body.status === 'approved') {
    if (!canApprove) throw new ForbiddenError()
  } else if (body.status === 'cancelled') {
    if (po.status === 'approved') {
      if (!canApprove) throw new ForbiddenError()
    } else if (po.status === 'draft' || po.status === 'submitted') {
      if (!canEdit) throw new ForbiddenError()
    }
  }
}

export const purchaseOrderRoutes = new Elysia({ prefix: '/purchase-orders' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:view'))
      .get(
        '/options',
        async () => {
          const data = await PurchaseOrderService.options()
          return { success: true, data }
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:view'))
      .get(
        '/',
        async ({ query }) => {
          const q: Parameters<typeof PurchaseOrderService.list>[0] = {}
          if (query.page !== undefined) q.page = Number(query.page)
          if (query.limit !== undefined) q.limit = Number(query.limit)
          if (query.perPage !== undefined) q.perPage = Number(query.perPage)
          if (query.status !== undefined) q.status = query.status
          if (query.vendorId !== undefined) q.vendorId = query.vendorId
          if (query.dateFrom !== undefined) q.dateFrom = query.dateFrom
          if (query.dateTo !== undefined) q.dateTo = query.dateTo
          const result = await PurchaseOrderService.list(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        { query: listQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:create'))
      .post(
        '/',
        async ({ body, user, set }) => {
          const data = await PurchaseOrderService.create(
            {
              vendorId: body.vendorId,
              issueDate: body.issueDate,
              expectedDeliveryDate: body.expectedDeliveryDate,
              departmentId: body.departmentId,
              projectBudgetId: body.projectBudgetId,
              notes: body.notes,
              items: body.items.map((i: PoItemBody) => ({
                description: i.description,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice),
                ...(i.unit != null ? { unit: i.unit } : {}),
              })),
            },
            user.userId
          )
          set.status = 201
          return { success: true, data, message: 'Created' }
        },
        {
          body: t.Object({
            vendorId: t.String({ minLength: 1 }),
            issueDate: t.String({ format: 'date' }),
            expectedDeliveryDate: t.Optional(t.String({ format: 'date' })),
            departmentId: t.Optional(t.String()),
            projectBudgetId: t.Optional(t.String()),
            notes: t.Optional(t.String()),
            items: t.Array(poItemSchema, { minItems: 1 }),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:view'))
      .get(
        '/:id/pdf',
        ({ set }) => {
          set.status = 501
          return { success: false, message: 'PDF export not implemented in this batch' }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:view'))
      .get(
        '/:id/ap-bills',
        async ({ params }) => {
          const data = await PurchaseOrderService.listApBills(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:view'))
      .get(
        '/:id/goods-receipts',
        async ({ params }) => {
          const data = await PurchaseOrderService.listGoodsReceipts(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:edit'))
      .post(
        '/:id/goods-receipts',
        async ({ params, body, user, set }) => {
          const data = await PurchaseOrderService.createGoodsReceipt(params.id, {
            receivedDate: body.receivedDate,
            receivedBy: body.receivedBy ?? user.userId,
            notes: body.notes,
            items: body.items.map((it: GrLineBody) => ({
              poItemId: it.poItemId,
              receivedQty: Number(it.receivedQty),
              notes: it.notes,
            })),
          })
          set.status = 201
          return { success: true, data, message: 'Goods receipt created' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            receivedDate: t.String({ format: 'date' }),
            receivedBy: t.Optional(t.String()),
            notes: t.Optional(t.String()),
            items: t.Array(
              t.Object({
                poItemId: t.String({ minLength: 1 }),
                receivedQty: t.Numeric({ minimum: 0.0001 }),
                notes: t.Optional(t.String()),
              }),
              { minItems: 1 }
            ),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:edit', 'finance:purchase_order:approve'))
      .patch(
        '/:id/status',
        async ({ params, body, user }) => {
          await assertPoStatusChangeAllowed(user.userId, user.roles, params.id, body)
          const result = await PurchaseOrderService.updateStatus(params.id, body, user.userId)
          return { success: true, data: result.detail, meta: { budgetImpact: result.budgetImpact }, message: 'Status updated' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            status: t.Union([t.Literal('submitted'), t.Literal('approved'), t.Literal('cancelled')]),
            reason: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:edit'))
      .patch(
        '/:id',
        async ({ params, body }) => {
          const data = await PurchaseOrderService.update(params.id, {
            ...(body.vendorId !== undefined ? { vendorId: body.vendorId } : {}),
            ...(body.issueDate !== undefined ? { issueDate: body.issueDate } : {}),
            ...(body.expectedDeliveryDate !== undefined ? { expectedDeliveryDate: body.expectedDeliveryDate } : {}),
            ...(body.departmentId !== undefined ? { departmentId: body.departmentId } : {}),
            ...(body.projectBudgetId !== undefined ? { projectBudgetId: body.projectBudgetId } : {}),
            ...(body.notes !== undefined ? { notes: body.notes } : {}),
            ...(body.items !== undefined
              ? {
                  items: body.items.map((i: PoItemBody) => ({
                    description: i.description,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    ...(i.unit != null ? { unit: i.unit } : {}),
                  })),
                }
              : {}),
          })
          return { success: true, data, message: 'Updated' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            vendorId: t.Optional(t.String()),
            issueDate: t.Optional(t.String({ format: 'date' })),
            expectedDeliveryDate: t.Optional(t.String({ format: 'date' })),
            departmentId: t.Optional(t.String()),
            projectBudgetId: t.Optional(t.String()),
            notes: t.Optional(t.String()),
            items: t.Optional(t.Array(poItemSchema, { minItems: 1 })),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:purchase_order:view'))
      .get(
        '/:id',
        async ({ params }) => {
          const data = await PurchaseOrderService.getById(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
