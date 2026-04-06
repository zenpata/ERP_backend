import { date, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

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
