import { Elysia } from 'elysia'
import { apRoutes } from './submodules/ap/ap.routes'
import { assetsRoutes } from './submodules/assets/assets.routes'
import { bankAccountRoutes } from './submodules/bank-account/bank-account.routes'
import { bankReconcileRoutes } from './submodules/bank-reconcile/bank-reconcile.routes'
import { collectionRoutes } from './submodules/collection/collection.routes'
import { customersRoutes } from './submodules/customers/customers.routes'
import { accountsRoutes } from './submodules/gl/accounts.routes'
import { journalRoutes } from './submodules/gl/journal.routes'
import { inventoryRoutes } from './submodules/inventory/inventory.routes'
import { invoiceRoutes } from './submodules/invoice/invoice.routes'
import { periodLockRoutes } from './submodules/period-lock/period-lock.routes'
import { purchaseOrderRoutes } from './submodules/purchase-order/purchase-order.routes'
import { quotationRoutes } from './submodules/quotation/quotation.routes'
import { recurringInvoiceRoutes } from './submodules/recurring-invoice/recurring-invoice.routes'
import { reportsRoutes } from './submodules/reports/reports.routes'
import { salesOrderRoutes } from './submodules/sales-order/sales-order.routes'
import { taxRoutes } from './submodules/tax/tax.routes'
import { vendorRoutes } from './submodules/vendor/vendor.routes'

// ============================================================
// finance/index.ts — Finance module plugin
// prefix: /api/finance
// ============================================================

export const financeModule = new Elysia({ prefix: '/finance' })
  .get('/health', () => ({ success: true, data: { module: 'finance', status: 'ok' } }))
  .use(customersRoutes)
  .use(quotationRoutes)
  .use(salesOrderRoutes)
  .use(purchaseOrderRoutes)
  .use(invoiceRoutes)
  .use(vendorRoutes)
  .use(bankAccountRoutes)
  .use(bankReconcileRoutes)
  .use(taxRoutes)
  .use(apRoutes)
  .use(reportsRoutes)
  .use(accountsRoutes)
  .use(journalRoutes)
  .use(periodLockRoutes)
  .use(recurringInvoiceRoutes)
  .use(collectionRoutes)
  .use(assetsRoutes)
  .use(inventoryRoutes)
