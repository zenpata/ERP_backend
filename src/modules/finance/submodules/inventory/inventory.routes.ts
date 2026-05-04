import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { InventoryService } from './inventory.service'

// ============================================================
// inventory.routes.ts — Product & Stock Management API (R3-05)
// prefix: mounted under /api/finance (actually /api/inventory separately)
// ============================================================

export const inventoryRoutes = new Elysia({ prefix: '/inventory' })
  .use(
    new Elysia()
      .use(requireAnyPermission('inventory:view', 'inventory:edit'))
      .get('/products', async ({ query }) => {
        const params: {
          page: number
          perPage: number
          search?: string
          isActive?: boolean
        } = {
          page: query.page !== undefined ? Number(query.page) : 1,
          perPage: query.perPage !== undefined ? Number(query.perPage) : 20,
        }
        if (query.search) params.search = query.search
        if (query.isActive !== undefined) params.isActive = query.isActive === 'true'
        const result = await InventoryService.listProducts(params)
        return { success: true, data: result.data, meta: result.meta }
      }, {
        query: t.Object({
          page: t.Optional(t.Numeric({ minimum: 1 })),
          perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          search: t.Optional(t.String()),
          isActive: t.Optional(t.String()),
        })
      })
      .get('/products/:id', async ({ params }) => {
        const product = await InventoryService.getProduct(params.id)
        return { success: true, data: product }
      })
      .get('/products/:id/stock', async ({ params }) => {
        const stock = await InventoryService.getProductStock(params.id)
        return { success: true, data: stock }
      })
      .get('/reports/on-hand', async () => {
        const report = await InventoryService.getOnHandReport()
        return { success: true, data: report }
      })
      .get('/reports/movement', async ({ query }) => {
        const movements = await InventoryService.getMovementReport(
          query.productId,
          query.movementType as any
        )
        return { success: true, data: movements }
      }, {
        query: t.Object({
          productId: t.Optional(t.String({ format: 'uuid' })),
          movementType: t.Optional(t.String()),
        })
      })
      .get('/alerts/low-stock', async () => {
        const alerts = await InventoryService.getLowStockAlert()
        return { success: true, data: alerts }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('inventory:edit'))
      .post('/products', async ({ body }) => {
        const product = await InventoryService.createProduct(body)
        return { success: true, data: product }
      }, {
        body: t.Object({
          sku: t.String({ minLength: 1, maxLength: 100 }),
          name: t.String({ minLength: 1, maxLength: 300 }),
          unit: t.String({ minLength: 1, maxLength: 40 }),
          costPrice: t.String({ pattern: '^[0-9]+(\\.[0-9]{1,2})?$' }),
          sellingPrice: t.String({ pattern: '^[0-9]+(\\.[0-9]{1,2})?$' }),
          reorderPoint: t.String({ pattern: '^[0-9]+(\\.[0-9]{1,2})?$' }),
          cogsAccountId: t.String({ format: 'uuid' }),
          inventoryAccountId: t.String({ format: 'uuid' }),
          revenueAccountId: t.String({ format: 'uuid' }),
          trackInventory: t.Boolean(),
        })
      })
      .patch('/products/:id', async ({ params, body }) => {
        const product = await InventoryService.updateProduct(params.id, body)
        return { success: true, data: product }
      }, {
        body: t.Object({
          name: t.Optional(t.String({ minLength: 1 })),
          unit: t.Optional(t.String({ minLength: 1 })),
          costPrice: t.Optional(t.String()),
          sellingPrice: t.Optional(t.String()),
          reorderPoint: t.Optional(t.String()),
        })
      })
      .patch('/products/:id/activate', async ({ params, body }) => {
        const product = await InventoryService.toggleProductActive(params.id, body.isActive)
        return { success: true, data: product }
      }, {
        body: t.Object({
          isActive: t.Boolean(),
        })
      })
      .post('/products/:id/adjust', async ({ params, body }) => {
        const movement = await InventoryService.adjustStock(
          params.id,
          body.quantity,
          body.reason,
          body.userId
        )
        return { success: true, data: movement }
      }, {
        body: t.Object({
          quantity: t.String({ pattern: '^-?[0-9]+(\\.[0-9]{1,4})?$' }),
          reason: t.String({ minLength: 1 }),
          userId: t.String({ format: 'uuid' }),
        })
      })
  )
