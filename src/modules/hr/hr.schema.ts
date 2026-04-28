import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// ============================================================
// hr.schema.ts — Drizzle table definitions สำหรับ HR module
//
// Sections:
//   1. Organization  (departments, positions)
//   2. Auth          (users, roles, permissions, role_permissions, user_roles)
//   3. Employees     (employees)
//   4. Leave         (leave_types, leave_approval_configs, leave_balances, leave_requests)
//   5. Attendance    (work_schedules, employee_schedules, attendance_records, holidays, overtime_requests)
//   6. Payroll       (payroll_configs, allowance_types, payroll_runs, payslips, payslip_items, employee_tax_settings)
//   7. Social Sec.   (ss_records, ss_submissions)
// ============================================================

// ─────────────────────────────────────────────────────────────
// SECTION 1 — ORGANIZATION
// ─────────────────────────────────────────────────────────────

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id'), // self-ref → departments.id (ไม่ใช้ .references เพื่อหลีกเลี่ยง circular)
  managerId: uuid('manager_id'), // forward-ref → employees.id (set ทีหลัง)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  level: integer('level').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// SECTION 2 — AUTH & ROLE/PERMISSION
// ─────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id'), // forward-ref → employees.id (nullable, super_admin อาจไม่มี)
  email: varchar('email', { length: 200 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  loginLocked: boolean('login_locked').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  // isSystem = true → ลบ/เปลี่ยนชื่อไม่ได้ (super_admin, hr_admin, hr_staff, manager, employee)
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  // module: hr | finance | pm | system
  module: varchar('module', { length: 20 }).notNull(),
  // resource: employee | leave | payroll | attendance | role | user | report
  resource: varchar('resource', { length: 50 }).notNull(),
  // action: view | create | edit | delete | approve | export
  action: varchar('action', { length: 20 }).notNull(),
  description: text('description'),
}, (table) => [
  unique().on(table.module, table.resource, table.action),
])

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
])

/** Grant/revoke trail when role permissions are updated (Settings). */
export const permissionAuditLogs = pgTable('permission_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id')
    .notNull()
    .references(() => users.id),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id')
    .notNull()
    .references(() => permissions.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId] }),
])

// ─────────────────────────────────────────────────────────────
// SECTION 3 — EMPLOYEES
// ─────────────────────────────────────────────────────────────

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  nationalId: varchar('national_id', { length: 13 }).notNull().unique(),

  // ข้อมูลส่วนตัว
  firstnameTh: varchar('firstname_th', { length: 100 }).notNull(),
  lastnameTh: varchar('lastname_th', { length: 100 }).notNull(),
  firstnameEn: varchar('firstname_en', { length: 100 }),
  lastnameEn: varchar('lastname_en', { length: 100 }),
  nickname: varchar('nickname', { length: 50 }),
  birthDate: date('birth_date').notNull(),
  // gender: male | female | other
  gender: varchar('gender', { length: 10 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 200 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  address: text('address'),

  // ข้อมูลการทำงาน
  departmentId: uuid('department_id').references(() => departments.id),
  positionId: uuid('position_id').references(() => positions.id),
  managerId: uuid('manager_id'), // self-ref → employees.id
  // employmentType: monthly | daily | contract
  employmentType: varchar('employment_type', { length: 20 }).notNull().default('monthly'),
  // status: active | resigned | terminated | inactive
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),

  // ข้อมูลการเงิน
  baseSalary: numeric('base_salary', { precision: 15, scale: 2 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }),
  bankAccountNumber: varchar('bank_account_number', { length: 20 }),
  bankAccountName: varchar('bank_account_name', { length: 200 }),

  // ประกันสังคม
  ssEnrolled: boolean('ss_enrolled').notNull().default(true),

  // link ไปยัง users table สำหรับ login
  userId: uuid('user_id').references(() => users.id),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// SECTION 4 — LEAVE
// ─────────────────────────────────────────────────────────────

export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  // code: sick | annual | personal | maternity | ordination
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  maxDaysPerYear: numeric('max_days_per_year', { precision: 5, scale: 1 }).notNull(),
  isCarryOver: boolean('is_carry_over').notNull().default(false),
  // null = ไม่จำกัดจำนวนวันที่โอน
  carryOverMaxDays: integer('carry_over_max_days'),
  requiresDocument: boolean('requires_document').notNull().default(false),
  // null = ต้องแนบเอกสารทุกครั้ง, n = ต้องแนบเมื่อลาเกิน n วัน
  documentRequiredAfterDays: integer('document_required_after_days'),
  isPaid: boolean('is_paid').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const leaveApprovalConfigs = pgTable('leave_approval_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  // null = ใช้กับทุกประเภทการลา
  leaveTypeId: uuid('leave_type_id').references(() => leaveTypes.id),
  autoApprove: boolean('auto_approve').notNull().default(false),
  // null = ไม่ auto approve, n = approve อัตโนมัติหลัง n ชั่วโมงถ้าไม่มี action
  autoApproveAfterHours: integer('auto_approve_after_hours'),
  requireManagerApproval: boolean('require_manager_approval').notNull().default(true),
  requireHrApproval: boolean('require_hr_approval').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const leaveBalances = pgTable('leave_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id),
  year: integer('year').notNull(),
  entitledDays: numeric('entitled_days', { precision: 5, scale: 1 }).notNull(),
  usedDays: numeric('used_days', { precision: 5, scale: 1 }).notNull().default('0'),
  pendingDays: numeric('pending_days', { precision: 5, scale: 1 }).notNull().default('0'),
  carriedOverDays: numeric('carried_over_days', { precision: 5, scale: 1 }).notNull().default('0'),
}, (table) => [
  unique().on(table.employeeId, table.leaveTypeId, table.year),
])

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  // Legacy DB column name is "days" (not "days_count")
  daysCount: numeric('days', { precision: 5, scale: 1 }).notNull(),
  reason: text('reason'),
  // status: pending | approved | rejected | cancelled
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  // Legacy DB column name is "approved_by" (not "approver_id")
  approverId: uuid('approved_by').references(() => employees.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// SECTION 5 — TIME & ATTENDANCE
// ─────────────────────────────────────────────────────────────

export const workSchedules = pgTable('work_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  breakDurationMinutes: integer('break_duration_minutes').notNull().default(60),
  lateToleranceMinutes: integer('late_tolerance_minutes').notNull().default(0),
  // clockMode: admin | self | auto | none
  clockMode: varchar('clock_mode', { length: 20 }).notNull().default('self'),
  // workDays: [1=จันทร์ … 7=อาทิตย์]
  workDays: jsonb('work_days').notNull().$type<number[]>().default([1, 2, 3, 4, 5]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const employeeSchedules = pgTable('employee_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  workScheduleId: uuid('work_schedule_id').notNull().references(() => workSchedules.id),
  effectiveFrom: date('effective_from').notNull(),
  // null = ยังใช้งานอยู่
  effectiveTo: date('effective_to'),
})

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  date: date('date').notNull(),
  clockIn: timestamp('clock_in'),
  clockOut: timestamp('clock_out'),
  // คำนวณจาก clockOut - clockIn - breakDurationMinutes
  workMinutes: integer('work_minutes'),
  overtimeMinutes: integer('overtime_minutes').notNull().default(0),
  breakMinutes: integer('break_minutes').notNull().default(0),
  /** Minutes late vs schedule start (after tolerance); set at check-in */
  lateMinutes: integer('late_minutes'),
  // status: present | late | absent | leave | holiday | off
  status: varchar('status', { length: 20 }).notNull().default('present'),
  // clockMethod: admin | self | auto | none
  clockMethod: varchar('clock_method', { length: 20 }),
  isManualEdit: boolean('is_manual_edit').notNull().default(false),
  editedBy: uuid('edited_by').references(() => users.id),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  unique().on(table.employeeId, table.date),
])

export const holidays = pgTable('holidays', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  // type: national | company
  type: varchar('type', { length: 20 }).notNull().default('national'),
  year: integer('year').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const overtimeRequests = pgTable('overtime_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  date: date('date').notNull(),
  requestedHours: numeric('requested_hours', { precision: 4, scale: 2 }).notNull(),
  reason: text('reason'),
  // status: pending | approved | rejected
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => employees.id),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// SECTION 6 — PAYROLL
// ─────────────────────────────────────────────────────────────

// ค่า config ที่ใช้คำนวณ — แก้ไขได้เมื่อกฎหมายเปลี่ยน
// keys: personal_allowance | salary_expense_rate | ss_min_base | ss_max_base | ss_rate
export const payrollConfigs = pgTable('payroll_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  value: varchar('value', { length: 100 }).notNull(),
  description: text('description'),
  effectiveFrom: date('effective_from').notNull(),
  // null = ยังมีผลอยู่
  effectiveTo: date('effective_to'),
})

export const allowanceTypes = pgTable('allowance_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  isTaxable: boolean('is_taxable').notNull().default(false),
  defaultAmount: numeric('default_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
})

export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodMonth: integer('period_month').notNull(), // 1-12
  periodYear: integer('period_year').notNull(),
  // status: draft | processing | approved | paid
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  totalGross: numeric('total_gross', { precision: 15, scale: 2 }),
  totalDeductions: numeric('total_deductions', { precision: 15, scale: 2 }),
  totalNet: numeric('total_net', { precision: 15, scale: 2 }),
  processedAt: timestamp('processed_at'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  paidAt: timestamp('paid_at'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  unique().on(table.periodMonth, table.periodYear),
])

export const payslips = pgTable('payslips', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),

  // วันทำงาน
  workingDaysInMonth: integer('working_days_in_month').notNull(),
  actualWorkingDays: numeric('actual_working_days', { precision: 5, scale: 1 }).notNull(),
  absentDays: numeric('absent_days', { precision: 5, scale: 1 }).notNull().default('0'),

  // รายได้
  baseSalary: numeric('base_salary', { precision: 15, scale: 2 }).notNull(),
  overtimeAmount: numeric('overtime_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  allowanceTotal: numeric('allowance_total', { precision: 15, scale: 2 }).notNull().default('0'),
  bonusTotal: numeric('bonus_total', { precision: 15, scale: 2 }).notNull().default('0'),
  grossSalary: numeric('gross_salary', { precision: 15, scale: 2 }).notNull(),

  // รายหัก
  ssDeduction: numeric('ss_deduction', { precision: 15, scale: 2 }).notNull().default('0'),
  incomeTaxDeduction: numeric('income_tax_deduction', { precision: 15, scale: 2 }).notNull().default('0'),
  otherDeductions: numeric('other_deductions', { precision: 15, scale: 2 }).notNull().default('0'),

  // สุทธิ
  netSalary: numeric('net_salary', { precision: 15, scale: 2 }).notNull(),

  // taxCalculationMode: auto | manual
  taxCalculationMode: varchar('tax_calculation_mode', { length: 10 }).notNull().default('auto'),
  pdfUrl: varchar('pdf_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  unique().on(table.payrollRunId, table.employeeId),
])

// รายการรายได้/หักแต่ละรายการในสลิป
export const payslipItems = pgTable('payslip_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  payslipId: uuid('payslip_id').notNull().references(() => payslips.id, { onDelete: 'cascade' }),
  // itemType: allowance | bonus | deduction
  itemType: varchar('item_type', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  isTaxable: boolean('is_taxable').notNull().default(false),
  note: text('note'),
})

// ตั้งค่าลดหย่อนภาษีรายคนรายปี
export const employeeTaxSettings = pgTable('employee_tax_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  year: integer('year').notNull(),

  // รายการลดหย่อน (บาท)
  spouseAllowance: numeric('spouse_allowance', { precision: 15, scale: 2 }).notNull().default('0'),       // 60,000
  childCount: integer('child_count').notNull().default(0),                                                // คนละ 30,000
  parentSupportCount: integer('parent_support_count').notNull().default(0),                              // คนละ 30,000
  lifeInsurancePremium: numeric('life_insurance_premium', { precision: 15, scale: 2 }).notNull().default('0'),    // max 100,000
  healthInsurancePremium: numeric('health_insurance_premium', { precision: 15, scale: 2 }).notNull().default('0'), // max 25,000
  providentFundAmount: numeric('provident_fund_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  mortgageInterest: numeric('mortgage_interest', { precision: 15, scale: 2 }).notNull().default('0'),     // max 100,000
  rmfAmount: numeric('rmf_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  ssfAmount: numeric('ssf_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  otherDeductions: numeric('other_deductions', { precision: 15, scale: 2 }).notNull().default('0'),

  // override: ถ้า true ใช้ manualTaxAmount แทนการคำนวณอัตโนมัติ
  isManualOverride: boolean('is_manual_override').notNull().default(false),
  manualTaxAmount: numeric('manual_tax_amount', { precision: 15, scale: 2 }),
}, (table) => [
  unique().on(table.employeeId, table.year),
])

// ─────────────────────────────────────────────────────────────
// SECTION 7 — SOCIAL SECURITY
// ─────────────────────────────────────────────────────────────

// บันทึก ปกส. รายคนรายเดือน (คำนวณพร้อมกับ payroll)
export const ssRecords = pgTable('ss_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  periodMonth: integer('period_month').notNull(), // 1-12
  periodYear: integer('period_year').notNull(),
  baseSalary: numeric('base_salary', { precision: 15, scale: 2 }).notNull(),
  // cappedBase = min(max(baseSalary, 1650), 15000)
  cappedBase: numeric('capped_base', { precision: 15, scale: 2 }).notNull(),
  // employeeContribution = cappedBase * 5%
  employeeContribution: numeric('employee_contribution', { precision: 15, scale: 2 }).notNull(),
  // employerContribution = cappedBase * 5%
  employerContribution: numeric('employer_contribution', { precision: 15, scale: 2 }).notNull(),
  totalContribution: numeric('total_contribution', { precision: 15, scale: 2 }).notNull(),
  payslipId: uuid('payslip_id').references(() => payslips.id),
  isEnrolled: boolean('is_enrolled').notNull().default(true),
}, (table) => [
  unique().on(table.employeeId, table.periodMonth, table.periodYear),
])

// สรุปการยื่น สปส. รายเดือน (สำหรับ export สปส.10-3)
export const ssSubmissions = pgTable('ss_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),
  totalEmployees: integer('total_employees').notNull(),
  totalEmployeeContribution: numeric('total_employee_contribution', { precision: 15, scale: 2 }).notNull(),
  totalEmployerContribution: numeric('total_employer_contribution', { precision: 15, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  // status: pending | submitted
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  submittedBy: uuid('submitted_by').references(() => users.id),
  submittedAt: timestamp('submitted_at'),
  exportFileUrl: varchar('export_file_url', { length: 500 }),
}, (table) => [
  unique().on(table.periodMonth, table.periodYear),
])
