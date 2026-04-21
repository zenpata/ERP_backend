import { Elysia } from 'elysia'
import { apRoutes } from './submodules/ap/ap.routes'
import { customersRoutes } from './submodules/customers/customers.routes'
import { bankAccountRoutes } from './submodules/bank-account/bank-account.routes'
import { accountsRoutes } from './submodules/gl/accounts.routes'
import { journalRoutes } from './submodules/gl/journal.routes'
import { invoiceRoutes } from './submodules/invoice/invoice.routes'
import { quotationRoutes } from './submodules/quotation/quotation.routes'
import { reportsRoutes } from './submodules/reports/reports.routes'
import { purchaseOrderRoutes } from './submodules/purchase-order/purchase-order.routes'
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
  .use(taxRoutes)
  .use(apRoutes)
  .use(reportsRoutes)
  .use(accountsRoutes)
  .use(journalRoutes)
