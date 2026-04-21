import { date, integer, jsonb, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

// ============================================================
// pm.schema.ts — Drizzle table definitions สำหรับ PM module
// ============================================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  customerId: uuid('customer_id'), // reference to finance.customers — ผ่าน shared ref
  status: varchar('status', { length: 20 }).notNull().default('planning'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  budget: numeric('budget', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name', { length: 200 }).notNull(),
  dueDate: date('due_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const projectTasks = pgTable('project_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  milestoneId: uuid('milestone_id').references(() => milestones.id),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('todo'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  assigneeId: uuid('assignee_id'), // reference to hr.employees — ผ่าน shared ref
  estimatedHours: numeric('estimated_hours', { precision: 8, scale: 2 }),
  dueDate: date('due_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const timesheets = pgTable('timesheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  taskId: uuid('task_id').references(() => projectTasks.id),
  employeeId: uuid('employee_id').notNull(), // reference to hr.employees — ผ่าน shared ref
  date: date('date').notNull(),
  hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Prototype PM: budgets / expenses / progress (wireframe + frontend) ───

export const pmBudgets = pgTable('pm_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetCode: varchar('budget_code', { length: 30 }).notNull().unique(),
  projectName: varchar('project_name', { length: 200 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  budgetType: varchar('budget_type', { length: 50 }).notNull(),
  moduleTags: jsonb('module_tags').$type<string[]>().notNull().default([]),
  ownerName: varchar('owner_name', { length: 200 }).notNull(),
  status: varchar('status', { length: 30 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const pmExpenses = pgTable('pm_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseCode: varchar('expense_code', { length: 30 }).notNull().unique(),
  title: varchar('title', { length: 300 }).notNull(),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => pmBudgets.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  expenseDate: date('expense_date').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  status: varchar('status', { length: 40 }).notNull(),
  requestedByEmployeeId: uuid('requested_by_employee_id'),
  approvedByUserId: uuid('approved_by_user_id'),
  note: text('note'),
  receiptUrl: varchar('receipt_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const pmProgressTasks = pgTable('pm_progress_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskCode: varchar('task_code', { length: 30 }).notNull().unique(),
  title: varchar('title', { length: 300 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(),
  phase: varchar('phase', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).notNull(),
  priority: varchar('priority', { length: 20 }).notNull(),
  progressPct: integer('progress_pct').notNull().default(0),
  startDate: date('start_date').notNull(),
  targetDate: date('target_date').notNull(),
  assigneeEmployeeId: uuid('assignee_employee_id'),
  note: text('note'),
  actualEndDate: date('actual_end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
