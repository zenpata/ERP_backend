import { relations } from 'drizzle-orm'
import {
  apBills,
  apVendorInvoiceItems,
  apVendorInvoicePayments,
  assetDepreciationSchedule,
  bankStatementImports,
  bankStatementLines,
  customers,
  fixedAssets,
  invoiceCollectionNotes,
  invoiceItems,
  invoicePayments,
  invoices,
  journalEntries,
  journalLines,
  products,
  recurringInvoiceRuns,
  recurringInvoiceTemplates,
  stockMovements,
} from './finance.schema'

export const apBillsRelations = relations(apBills, ({ many }) => ({
  items: many(apVendorInvoiceItems),
  payments: many(apVendorInvoicePayments),
}))

export const apVendorInvoiceItemsRelations = relations(apVendorInvoiceItems, ({ one }) => ({
  bill: one(apBills, {
    fields: [apVendorInvoiceItems.apBillId],
    references: [apBills.id],
  }),
}))

export const apVendorInvoicePaymentsRelations = relations(apVendorInvoicePayments, ({ one }) => ({
  bill: one(apBills, {
    fields: [apVendorInvoicePayments.apBillId],
    references: [apBills.id],
  }),
}))

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  lines: many(journalLines),
}))

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalLines.entryId],
    references: [journalEntries.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
  collectionNotes: many(invoiceCollectionNotes),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
}))

export const invoiceCollectionNotesRelations = relations(invoiceCollectionNotes, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceCollectionNotes.invoiceId],
    references: [invoices.id],
  }),
}))

export const recurringInvoiceTemplatesRelations = relations(recurringInvoiceTemplates, ({ one, many }) => ({
  customer: one(customers, {
    fields: [recurringInvoiceTemplates.customerId],
    references: [customers.id],
  }),
  runs: many(recurringInvoiceRuns),
}))

export const recurringInvoiceRunsRelations = relations(recurringInvoiceRuns, ({ one }) => ({
  template: one(recurringInvoiceTemplates, {
    fields: [recurringInvoiceRuns.templateId],
    references: [recurringInvoiceTemplates.id],
  }),
  invoice: one(invoices, {
    fields: [recurringInvoiceRuns.invoiceId],
    references: [invoices.id],
  }),
}))

export const bankStatementImportsRelations = relations(bankStatementImports, ({ many }) => ({
  lines: many(bankStatementLines),
}))

export const bankStatementLinesRelations = relations(bankStatementLines, ({ one }) => ({
  import: one(bankStatementImports, {
    fields: [bankStatementLines.importId],
    references: [bankStatementImports.id],
  }),
}))

export const productsRelations = relations(products, ({ many }) => ({
  movements: many(stockMovements),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
}))

export const fixedAssetsRelations = relations(fixedAssets, ({ many }) => ({
  schedule: many(assetDepreciationSchedule),
}))

export const assetDepreciationScheduleRelations = relations(assetDepreciationSchedule, ({ one }) => ({
  asset: one(fixedAssets, {
    fields: [assetDepreciationSchedule.assetId],
    references: [fixedAssets.id],
  }),
}))
