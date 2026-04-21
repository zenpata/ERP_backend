import { relations } from 'drizzle-orm'
import { apBills, apVendorInvoiceItems, apVendorInvoicePayments } from './finance.schema'

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
