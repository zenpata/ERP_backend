import { boolean, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

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
  creditLimit: numeric('credit_limit', { precision: 15, scale: 2 }).notNull().default('0'),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: varchar('invoice_number', { length: 20 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
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

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // asset | liability | equity | revenue | expense
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
  referenceId: uuid('reference_id'), // invoice_id, payroll_id, etc.
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
