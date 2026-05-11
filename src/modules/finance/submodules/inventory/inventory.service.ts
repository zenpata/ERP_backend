import { and, eq, inArray, sql, type SQL } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import {
  products,
  stockMovements,
  chartOfAccounts,
  journalEntries,
  journalLines,
} from '../../finance.schema'
import { JournalService } from '../gl/journal.service'

// ============================================================
// inventory.service.ts — Product & Stock Management (R3-05)
// ============================================================

export type ListProductsQuery = {
  page?: number
  perPage?: number
  search?: string
  isActive?: boolean
  lowStock?: boolean
}

export type CreateProductInput = {
  sku: string
  name: string
  unit: string
  costPrice: string
  sellingPrice: string
  reorderPoint: string
  cogsAccountId: string
  inventoryAccountId: string
  revenueAccountId: string
  trackInventory: boolean
}

export const InventoryService = {
  async listProducts(query: ListProductsQuery = {}) {
    const page = query.page ?? 1
    const perPage = query.perPage ?? 20
    const offset = (page - 1) * perPage

    const whereConditions: SQL<unknown>[] = []

    if (query.isActive !== undefined) {
      whereConditions.push(eq(products.isActive, query.isActive))
    } else {
      whereConditions.push(eq(products.isActive, true))
    }

    if (query.search) {
      whereConditions.push(sql`(${products.name} ILIKE ${`%${query.search}%`} OR ${products.sku} ILIKE ${`%${query.search}%`})`)
    }

    const where = whereConditions.length > 0 ? and(...whereConditions) : undefined

    const [items, countRows] = await Promise.all([
      db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          unit: products.unit,
          costPrice: products.costPrice,
          sellingPrice: products.sellingPrice,
          reorderPoint: products.reorderPoint,
          trackInventory: products.trackInventory,
          isActive: products.isActive,
        })
        .from(products)
        .where(where)
        .orderBy(sql`${products.createdAt} DESC`)
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(where),
    ])

    const count = countRows[0]?.count ?? 0

    return {
      data: items,
      meta: {
        page,
        perPage,
        total: count,
        totalPages: Math.ceil(count / perPage),
      },
    }
  },

  async getProduct(id: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (!product) throw new NotFoundError('product')
    return product
  },

  async createProduct(input: CreateProductInput) {
    const sku = input.sku.trim().toUpperCase()
    const [dup] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, sku))
      .limit(1)
    if (dup) throw new ConflictError('PRODUCT_SKU_DUPLICATE', 'SKU already exists', { sku: 'Duplicate SKU' })

    // Validate accounts exist
    const accountIds = [input.cogsAccountId, input.inventoryAccountId, input.revenueAccountId]
    const accounts = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(inArray(chartOfAccounts.id, accountIds))

    if (accounts.length !== 3) {
      throw new ValidationError({ accounts: ['One or more GL accounts not found'] })
    }

    const [product] = await db
      .insert(products)
      .values({
        sku: input.sku.trim().toUpperCase(),
        name: input.name.trim(),
        unit: input.unit.trim(),
        costPrice: new Decimal(input.costPrice).toFixed(2),
        sellingPrice: new Decimal(input.sellingPrice).toFixed(2),
        reorderPoint: new Decimal(input.reorderPoint).toFixed(2),
        cogsAccountId: input.cogsAccountId,
        inventoryAccountId: input.inventoryAccountId,
        revenueAccountId: input.revenueAccountId,
        trackInventory: input.trackInventory,
      })
      .returning()

    if (!product) throw new Error('Failed to create product')
    return product
  },

  async updateProduct(id: string, input: Partial<CreateProductInput>) {
    const existing = await this.getProduct(id)

    const updates: Partial<typeof products.$inferInsert> = {}
    if (input.name) updates.name = input.name.trim()
    if (input.unit) updates.unit = input.unit.trim()
    if (input.costPrice) updates.costPrice = new Decimal(input.costPrice).toFixed(2)
    if (input.sellingPrice) updates.sellingPrice = new Decimal(input.sellingPrice).toFixed(2)
    if (input.reorderPoint) updates.reorderPoint = new Decimal(input.reorderPoint).toFixed(2)

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning()

    return updated
  },

  async toggleProductActive(id: string, isActive: boolean) {
    const [updated] = await db
      .update(products)
      .set({ isActive })
      .where(eq(products.id, id))
      .returning()

    return updated
  },

  async getProductStock(id: string) {
    const product = await this.getProduct(id)

    if (!product.trackInventory) {
      return { productId: id, onHand: 0, movements: [] }
    }

    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, id))
      .orderBy(sql`${stockMovements.createdAt} DESC`)

    const onHand = movements.reduce((sum, m) => {
      const qty = new Decimal(m.quantity)
      return m.movementType === 'OUT' ? sum.minus(qty) : sum.plus(qty)
    }, new Decimal(0))

    return {
      productId: id,
      onHand: onHand.toFixed(4),
      movements: movements.map((m) => ({
        id: m.id,
        movementType: m.movementType,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalCost: m.totalCost,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        createdAt: m.createdAt,
      })),
    }
  },

  async adjustStock(
    productId: string,
    quantity: string,
    reason: string,
    userId: string
  ) {
    const product = await this.getProduct(productId)

    if (!product.trackInventory) {
      throw new ValidationError({ product: ['This product does not track inventory'] })
    }

    const qty = new Decimal(quantity)
    if (qty.isZero()) {
      throw new ValidationError({ quantity: ['Adjustment quantity cannot be zero'] })
    }

    return db.transaction(async (tx) => {
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          productId,
          movementType: qty.isPositive() ? 'IN' : 'OUT',
          quantity: qty.abs().toFixed(4),
          unitCost: product.costPrice,
          totalCost: qty.abs().mul(new Decimal(product.costPrice)).toFixed(2),
          referenceType: 'manual',
          notes: reason,
          createdBy: userId,
        })
        .returning()

      // Auto-create adjustment journal — if this throws, stock insert is rolled back
      if (product.inventoryAccountId) {
        const today = new Date().toISOString().split('T')[0] ?? new Date().toISOString()
        await JournalService.createDraft({
          date: today,
          description: `Stock adjustment: ${product.name} (${reason})`,
          lines: [
            {
              accountId: product.inventoryAccountId,
              debit: qty.isPositive() ? qty.mul(product.costPrice).toFixed(2) : '0',
              credit: qty.isNegative() ? qty.abs().mul(product.costPrice).toFixed(2) : '0',
              description: product.name,
            },
            // TODO: replace with a real "stock adjustment" GL account from settings
            {
              accountId: product.inventoryAccountId,
              debit: qty.isNegative() ? qty.abs().mul(product.costPrice).toFixed(2) : '0',
              credit: qty.isPositive() ? qty.mul(product.costPrice).toFixed(2) : '0',
              description: 'Adjustment offset',
            },
          ],
          createdBy: userId,
        })
      }

      return movement
    })
  },

  async processInvoiceOut(invoiceId: string, lines: Array<{ productId: string; quantity: number }>, userId: string) {
    // Called when invoice status changes to 'sent'
    for (const line of lines) {
      const product = await this.getProduct(line.productId)

      if (!product.trackInventory) continue

      // Create OUT movement
      const [movement] = await db
        .insert(stockMovements)
        .values({
          productId: line.productId,
          movementType: 'OUT',
          quantity: String(Math.abs(line.quantity)),
          unitCost: product.costPrice,
          totalCost: new Decimal(Math.abs(line.quantity)).mul(product.costPrice).toFixed(2),
          referenceType: 'invoice',
          referenceId: invoiceId,
          createdBy: userId,
        })
        .returning()

      if (!movement) throw new Error(`Failed to create stock movement for ${product.name}`)

      // Create COGS journal entry
      const amount = new Decimal(Math.abs(line.quantity)).mul(product.costPrice)

      if (!product.cogsAccountId || !product.inventoryAccountId) continue
      const today = new Date().toISOString().split('T')[0] ?? new Date().toISOString()
      await JournalService.createDraft({
        date: today,
        description: `COGS for invoice ${invoiceId}: ${product.name}`,
        referenceNo: invoiceId,
        lines: [
          {
            accountId: product.cogsAccountId,
            debit: amount.toFixed(2),
            credit: '0',
            description: product.name,
          },
          {
            accountId: product.inventoryAccountId,
            debit: '0',
            credit: amount.toFixed(2),
            description: product.name,
          },
        ],
        createdBy: userId,
      })
    }
  },

  async getOnHandReport() {
    const results = await db
      .select({
        productId: products.id,
        sku: products.sku,
        name: products.name,
        unit: products.unit,
        costPrice: products.costPrice,
        reorderPoint: products.reorderPoint,
      })
      .from(products)
      .where(eq(products.trackInventory, true))

    const report = await Promise.all(
      results.map(async (p) => {
        const stock = await this.getProductStock(p.productId)
        return {
          productId: p.productId,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
          onHand: stock.onHand,
          costPrice: p.costPrice,
          totalValue: new Decimal(stock.onHand).mul(p.costPrice).toFixed(2),
          reorderPoint: p.reorderPoint,
          isLowStock: new Decimal(stock.onHand).lessThan(p.reorderPoint),
        }
      })
    )

    return report.sort((a, b) => (a.isLowStock ? -1 : b.isLowStock ? 1 : 0))
  },

  async getMovementReport(productId?: string, movementType?: string) {
    let where: SQL<unknown> | undefined = undefined

    if (productId) {
      where = eq(stockMovements.productId, productId)
    }
    if (movementType) {
      where = where ? and(where, eq(stockMovements.movementType, movementType)) : eq(stockMovements.movementType, movementType)
    }

    return db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        productSku: products.sku,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        unitCost: stockMovements.unitCost,
        totalCost: stockMovements.totalCost,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(where)
      .orderBy(sql`${stockMovements.createdAt} DESC`)
  },

  async getLowStockAlert() {
    const report = await this.getOnHandReport()
    return report.filter((p) => p.isLowStock)
  },
}
