import { boolean, date, numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

// ============================================================
// hr.schema.ts — Drizzle table definitions สำหรับ HR module
// ============================================================

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  managerId: uuid('manager_id'), // self-reference — set after employees table
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  firstnameTh: varchar('firstname_th', { length: 100 }).notNull(),
  lastnameTh: varchar('lastname_th', { length: 100 }).notNull(),
  firstnameEn: varchar('firstname_en', { length: 100 }),
  lastnameEn: varchar('lastname_en', { length: 100 }),
  nationalId: varchar('national_id', { length: 13 }).notNull().unique(),
  gender: varchar('gender', { length: 10 }).notNull(),
  birthDate: date('birth_date').notNull(),
  employmentType: varchar('employment_type', { length: 20 }).notNull().default('full_time'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  departmentId: uuid('department_id').references(() => departments.id),
  positionId: uuid('position_id').references(() => positions.id),
  baseSalary: numeric('base_salary', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  daysPerYear: numeric('days_per_year', { precision: 5, scale: 1 }).notNull(),
  isPaid: boolean('is_paid').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  days: numeric('days', { precision: 5, scale: 1 }).notNull(),
  reason: varchar('reason', { length: 500 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => employees.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const payrollPeriods = pgTable('payroll_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: numeric('year', { precision: 4, scale: 0 }).notNull(),
  month: numeric('month', { precision: 2, scale: 0 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const payrollItems = pgTable('payroll_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodId: uuid('period_id').notNull().references(() => payrollPeriods.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  grossSalary: numeric('gross_salary', { precision: 15, scale: 2 }).notNull(),
  ssoEmployee: numeric('sso_employee', { precision: 15, scale: 2 }).notNull(),
  ssoEmployer: numeric('sso_employer', { precision: 15, scale: 2 }).notNull(),
  withholdingTax: numeric('withholding_tax', { precision: 15, scale: 2 }).notNull(),
  netSalary: numeric('net_salary', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
