import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { departments, employees, users } from '../hr/hr.schema'
import { pmBudgets } from '../pm/pm.schema'

// ============================================================
// finance.schema.ts — Drizzle table definitions สำหรับ Finance module
// ============================================================

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  taxId: varchar('tax_id', { length: 13 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  contactName: varchar('contact_name', { length: 200 }),
  creditLimit: numeric('credit_limit', { precision: 15, scale: 2 }).notNull().default('0'),
  creditTermDays: integer('credit_term_days').notNull().default(30),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  taxId: varchar('tax_id', { length: 13 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  contactName: varchar('contact_name', { length: 200 }),
  bankName: varchar('bank_name', { length: 100 }),
  bankAccountNumber: varchar('bank_account_number', { length: 40 }),
  bankAccountName: varchar('bank_account_name', { length: 200 }),
  paymentTermDays: integer('payment_term_days').notNull().default(30),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/** R2-3.11 — Quotation (header) */
export const quotations = pgTable('quotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  quotNo: varchar('quot_no', { length: 30 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  issueDate: timestamp('issue_date').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  subtotalBeforeVat: numeric('subtotal_before_vat', { precision: 15, scale: 2 }).notNull().default('0'),
  vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  termsAndConditions: text('terms_and_conditions'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const quotationItems = pgTable('quotation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  quotationId: uuid('quotation_id')
    .notNull()
    .references(() => quotations.id, { onDelete: 'cascade' }),
  itemNo: integer('item_no').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 15, scale: 2 }).notNull(),
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('7'),
})

/** R2-3.11 — Sales order */
export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  soNo: varchar('so_no', { length: 30 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  quotationId: uuid('quotation_id').references(() => quotations.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  orderDate: timestamp('order_date').notNull(),
  deliveryDate: timestamp('delivery_date'),
  status: varchar('status', { length: 24 }).notNull().default('draft'),
  subtotalBeforeVat: numeric('subtotal_before_vat', { precision: 15, scale: 2 }).notNull().default('0'),
  vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const soItems = pgTable('so_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  soId: uuid('so_id').notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  itemNo: integer('item_no').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 15, scale: 2 }).notNull(),
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('7'),
  invoicedQty: numeric('invoiced_qty', { precision: 15, scale: 4 }).notNull().default('0'),
})

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: varchar('invoice_number', { length: 20 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  salesOrderId: uuid('sales_order_id').references(() => salesOrders.id),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).notNull(),
  whtAmount: numeric('wht_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  whtType: varchar('wht_type', { length: 20 }),
  whtAmount: numeric('wht_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
})

/** AR — payment applied to customer invoice */
export const invoicePayments = pgTable('invoice_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  paymentDate: timestamp('payment_date').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 40 }).notNull(),
  bankAccountId: varchar('bank_account_id', { length: 64 }),
  referenceNo: varchar('reference_no', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  parentId: uuid('parent_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryNumber: varchar('entry_number', { length: 20 }).notNull().unique(),
  type: varchar('type', { length: 30 }).notNull().default('manual'),
  date: timestamp('date').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  referenceId: uuid('reference_id'),
  totalDebit: numeric('total_debit', { precision: 15, scale: 2 }).notNull(),
  totalCredit: numeric('total_credit', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryId: uuid('entry_id').notNull().references(() => journalEntries.id),
  accountId: uuid('account_id').notNull().references(() => chartOfAccounts.id),
  debit: numeric('debit', { precision: 15, scale: 2 }).notNull().default('0'),
  credit: numeric('credit', { precision: 15, scale: 2 }).notNull().default('0'),
  description: varchar('description', { length: 300 }),
})

/** R2-3.5 — Operating bank accounts (cash/bank) */
export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  accountName: varchar('account_name', { length: 200 }).notNull(),
  accountNo: varchar('account_no', { length: 40 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  branchName: varchar('branch_name', { length: 200 }),
  accountType: varchar('account_type', { length: 20 }).notNull().default('current'),
  currency: varchar('currency', { length: 10 }).notNull().default('THB'),
  openingBalance: numeric('opening_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  currentBalance: numeric('current_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  glAccountId: uuid('gl_account_id').references(() => chartOfAccounts.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const bankAccountTransactions = pgTable('bank_account_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  bankAccountId: uuid('bank_account_id')
    .notNull()
    .references(() => bankAccounts.id, { onDelete: 'cascade' }),
  transactionDate: date('transaction_date', { mode: 'string' }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  referenceType: varchar('reference_type', { length: 40 }),
  referenceId: uuid('reference_id'),
  sourceModule: varchar('source_module', { length: 20 }).notNull().default('manual'),
  reconciled: boolean('reconciled').notNull().default(false),
  reconciledAt: timestamp('reconciled_at'),
  reconciledBy: uuid('reconciled_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/** R2-3.6 — Purchase order + goods receipt (procurement) */
export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  poNo: varchar('po_no', { length: 30 }).notNull().unique(),
  vendorId: uuid('vendor_id')
    .notNull()
    .references(() => vendors.id),
  requestedBy: uuid('requested_by').notNull().references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  issueDate: timestamp('issue_date').notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  departmentId: uuid('department_id').references(() => departments.id),
  projectBudgetId: uuid('project_budget_id').references(() => pmBudgets.id),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const poItems = pgTable('po_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  poId: uuid('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  itemNo: integer('item_no').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 40 }),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 15, scale: 2 }).notNull(),
  receivedQty: numeric('received_qty', { precision: 15, scale: 4 }).notNull().default('0'),
})

export const goodsReceipts = pgTable('goods_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  grNo: varchar('gr_no', { length: 30 }).notNull().unique(),
  poId: uuid('po_id').notNull().references(() => purchaseOrders.id),
  receivedDate: timestamp('received_date').notNull(),
  receivedBy: uuid('received_by').notNull().references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const grItems = pgTable('gr_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  grId: uuid('gr_id').notNull().references(() => goodsReceipts.id, { onDelete: 'cascade' }),
  poItemId: uuid('po_item_id').notNull().references(() => poItems.id),
  receivedQty: numeric('received_qty', { precision: 15, scale: 4 }).notNull(),
  notes: varchar('notes', { length: 500 }),
})

/** AP — vendor invoice (header) */
export const apBills = pgTable('finance_ap_bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Internal document number (AP-NNNN), unique */
  referenceNumber: varchar('reference_number', { length: 40 }).notNull().unique(),
  vendorInvoiceNumber: varchar('vendor_invoice_number', { length: 80 }),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id),
  poId: uuid('po_id').references(() => purchaseOrders.id),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  receivedDate: timestamp('received_date').notNull(),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).notNull(),
  whtAmount: numeric('wht_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  expenseCategory: varchar('expense_category', { length: 40 }),
  attachmentUrl: varchar('attachment_url', { length: 500 }),
  notes: text('notes'),
  rejectReason: text('reject_reason'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const apVendorInvoiceItems = pgTable('finance_ap_vendor_invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  apBillId: uuid('ap_bill_id')
    .notNull()
    .references(() => apBills.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  whtType: varchar('wht_type', { length: 20 }),
  whtRate: numeric('wht_rate', { precision: 5, scale: 2 }),
})

export const apVendorInvoicePayments = pgTable('finance_ap_vendor_invoice_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  apBillId: uuid('ap_bill_id')
    .notNull()
    .references(() => apBills.id, { onDelete: 'cascade' }),
  paymentDate: date('payment_date', { mode: 'string' }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
  reference: varchar('reference', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/** R2-3.3 — VAT / WHT rate master */
export const taxRates = pgTable('tax_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 10 }).notNull(),
  code: varchar('code', { length: 40 }).notNull().unique(),
  rate: numeric('rate', { precision: 5, scale: 2 }).notNull(),
  description: varchar('description', { length: 300 }).notNull(),
  pndForm: varchar('pnd_form', { length: 10 }),
  incomeType: varchar('income_type', { length: 200 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/** R2-3.3 — Withholding tax certificate (PND1 / PND3 / PND53) */
export const whtCertificates = pgTable('wht_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  certificateNo: varchar('certificate_no', { length: 40 }).notNull().unique(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
  apBillId: uuid('ap_bill_id').references(() => apBills.id, { onDelete: 'set null' }),
  pndForm: varchar('pnd_form', { length: 10 }).notNull(),
  incomeType: varchar('income_type', { length: 200 }).notNull(),
  baseAmount: numeric('base_amount', { precision: 15, scale: 2 }).notNull(),
  whtRate: numeric('wht_rate', { precision: 5, scale: 2 }).notNull(),
  whtAmount: numeric('wht_amount', { precision: 15, scale: 2 }).notNull(),
  issuedDate: date('issued_date', { mode: 'string' }).notNull(),
  sourceModule: varchar('source_module', { length: 20 }).notNull().default('ap'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
