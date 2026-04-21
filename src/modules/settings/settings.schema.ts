import {
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { users } from '../hr/hr.schema'

export const companySettings = pgTable('company_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 200 }).notNull().default(''),
  companyNameEn: varchar('company_name_en', { length: 200 }),
  taxId: varchar('tax_id', { length: 20 }),
  logoUrl: text('logo_url'),
  currency: varchar('currency', { length: 10 }).notNull().default('THB'),
  defaultVatRate: numeric('default_vat_rate', { precision: 5, scale: 2 }).notNull().default('7'),
  invoicePrefix: varchar('invoice_prefix', { length: 20 }).default('INV'),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const fiscalPeriods = pgTable(
  'fiscal_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('open'),
    closedAt: timestamp('closed_at'),
    closedBy: uuid('closed_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [unique().on(table.year, table.month)]
)

export const inAppNotifications = pgTable('in_app_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  readAt: timestamp('read_at'),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: uuid('entity_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const notificationConfigs = pgTable('notification_configs', {
  key: varchar('key', { length: 100 }).primaryKey().notNull(),
  value: jsonb('value').notNull().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  action: varchar('action', { length: 100 }).notNull(),
  metadata: jsonb('metadata'),
})
