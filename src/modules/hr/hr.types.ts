import type { InferSelectModel } from 'drizzle-orm'
import type {
  allowanceTypes,
  attendanceRecords,
  departments,
  employeeSchedules,
  employeeTaxSettings,
  employees,
  holidays,
  leaveApprovalConfigs,
  leaveBalances,
  leaveRequests,
  leaveTypes,
  overtimeRequests,
  payrollConfigs,
  payrollRuns,
  payslipItems,
  payslips,
  permissions,
  positions,
  rolePermissions,
  roles,
  ssRecords,
  ssSubmissions,
  userRoles,
  users,
  workSchedules,
} from './hr.schema'

// ============================================================
// hr.types.ts — TypeScript types สำหรับ HR module
//
// ใช้ InferSelectModel จาก Drizzle เพื่อ types ตรงกับ schema เสมอ
// Payload types (Create/Update) อยู่ใน section ด้านล่าง
// ============================================================

// ─────────────────────────────────────────────────────────────
// SECTION 1 — INFERRED DB TYPES (source of truth)
// ─────────────────────────────────────────────────────────────

export type Department = InferSelectModel<typeof departments>
export type Position = InferSelectModel<typeof positions>

export type User = InferSelectModel<typeof users>
export type Role = InferSelectModel<typeof roles>
export type Permission = InferSelectModel<typeof permissions>
export type RolePermission = InferSelectModel<typeof rolePermissions>
export type UserRole = InferSelectModel<typeof userRoles>

export type Employee = InferSelectModel<typeof employees>

export type LeaveType = InferSelectModel<typeof leaveTypes>
export type LeaveApprovalConfig = InferSelectModel<typeof leaveApprovalConfigs>
export type LeaveBalance = InferSelectModel<typeof leaveBalances>
export type LeaveRequest = InferSelectModel<typeof leaveRequests>

export type WorkSchedule = InferSelectModel<typeof workSchedules>
export type EmployeeSchedule = InferSelectModel<typeof employeeSchedules>
export type AttendanceRecord = InferSelectModel<typeof attendanceRecords>
export type Holiday = InferSelectModel<typeof holidays>
export type OvertimeRequest = InferSelectModel<typeof overtimeRequests>

export type PayrollConfig = InferSelectModel<typeof payrollConfigs>
export type AllowanceType = InferSelectModel<typeof allowanceTypes>
export type PayrollRun = InferSelectModel<typeof payrollRuns>
export type Payslip = InferSelectModel<typeof payslips>
export type PayslipItem = InferSelectModel<typeof payslipItems>
export type EmployeeTaxSettings = InferSelectModel<typeof employeeTaxSettings>

export type SsRecord = InferSelectModel<typeof ssRecords>
export type SsSubmission = InferSelectModel<typeof ssSubmissions>

// ─────────────────────────────────────────────────────────────
// SECTION 2 — ENUM TYPES (ใช้แทน string ใน payload)
// ─────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other'
export type EmploymentType = 'monthly' | 'daily' | 'contract'
export type EmployeeStatus = 'active' | 'resigned' | 'terminated' | 'inactive'

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type LeaveTypeCode = 'sick' | 'annual' | 'personal' | 'maternity' | 'ordination'

export type ClockMode = 'admin' | 'self' | 'auto' | 'none'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'holiday' | 'off'
export type OvertimeStatus = 'pending' | 'approved' | 'rejected'
export type HolidayType = 'national' | 'company'

export type PayrollStatus = 'draft' | 'processing' | 'approved' | 'paid'
export type PayslipItemType = 'allowance' | 'bonus' | 'deduction'
export type TaxCalculationMode = 'auto' | 'manual'

export type SsSubmissionStatus = 'pending' | 'submitted'

// ─────────────────────────────────────────────────────────────
// SECTION 3 — EMPLOYEE PAYLOADS
// ─────────────────────────────────────────────────────────────

export type CreateEmployeePayload = {
  nationalId: string
  firstnameTh: string
  lastnameTh: string
  firstnameEn?: string
  lastnameEn?: string
  nickname?: string
  birthDate: string             // ISO date string YYYY-MM-DD
  gender: Gender
  phone?: string
  email?: string
  address?: string
  departmentId?: string
  positionId?: string
  managerId?: string
  employmentType: EmploymentType
  startDate: string             // ISO date string
  endDate?: string              // ISO date — optional at hire (e.g. fixed-term contract)
  baseSalary: string            // numeric string (Decimal.js compatible)
  bankName?: string
  bankAccountNumber?: string
  bankAccountName?: string
  ssEnrolled?: boolean
}

export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'nationalId'>> & {
  status?: EmployeeStatus
  endDate?: string
  avatarUrl?: string
}

export type ListEmployeeQuery = {
  page?: number
  perPage?: number
  search?: string
  departmentId?: string
  status?: EmployeeStatus
  employmentType?: EmploymentType
}

// ─────────────────────────────────────────────────────────────
// SECTION 3b — ORGANIZATION (departments / positions) QUERIES & DTOs
// ─────────────────────────────────────────────────────────────

export type ListDepartmentQuery = {
  page?: number
  perPage?: number
  search?: string
  parentId?: string
}

export type ListPositionQuery = {
  page?: number
  perPage?: number
  search?: string
  departmentId?: string
}

export type DepartmentDetail = Department & {
  parentName: string | null
  managerName: string | null
  childrenCount: number
  positionsCount: number
}

/** List row — same as table row; pagination applied in service */
export type PositionListRow = Position & {
  departmentName: string | null
}

export type PositionDetail = Position & {
  departmentName: string | null
  employeeCount: number
}

// ─────────────────────────────────────────────────────────────
// SECTION 4 — LEAVE PAYLOADS
// ─────────────────────────────────────────────────────────────

export type CreateLeaveRequestPayload = {
  leaveTypeId: string
  startDate: string
  endDate: string
  reason?: string
  documentUrl?: string
}

export type ApproveLeavePayload = {
  approverId: string
}

export type RejectLeavePayload = {
  rejectionReason: string
}

export type CreateLeaveTypePayload = {
  code: LeaveTypeCode | string
  name: string
  maxDaysPerYear: string
  isCarryOver?: boolean
  carryOverMaxDays?: number
  requiresDocument?: boolean
  documentRequiredAfterDays?: number
  isPaid?: boolean
}

// ─────────────────────────────────────────────────────────────
// SECTION 5 — ATTENDANCE PAYLOADS
// ─────────────────────────────────────────────────────────────

export type ClockInPayload = {
  employeeId: string
  clockIn?: string              // ISO timestamp — ถ้าไม่ส่งใช้ now()
  note?: string
}

export type ClockOutPayload = {
  employeeId: string
  clockOut?: string
  overtimeMinutes?: number
  note?: string
}

export type ManualAttendancePayload = {
  employeeId: string
  date: string
  clockIn?: string
  clockOut?: string
  status: AttendanceStatus
  note?: string
}

export type BulkAttendancePayload = {
  // สำหรับ clockMode = 'none' — เหมาทั้งทีม
  date: string
  employeeIds: string[]
  status: AttendanceStatus
}

export type CreateWorkSchedulePayload = {
  name: string
  startTime: string             // HH:MM
  endTime: string               // HH:MM
  breakDurationMinutes?: number
  lateToleranceMinutes?: number
  clockMode: ClockMode
  workDays?: number[]           // [1,2,3,4,5]
}

// ─────────────────────────────────────────────────────────────
// SECTION 6 — PAYROLL PAYLOADS
// ─────────────────────────────────────────────────────────────

export type CreatePayrollRunPayload = {
  periodMonth: number
  periodYear: number
}

export type UpdatePayslipPayload = {
  // manual overrides
  overtimeAmount?: string
  allowanceTotal?: string
  bonusTotal?: string
  otherDeductions?: string
  taxCalculationMode?: TaxCalculationMode
}

export type UpsertTaxSettingsPayload = {
  year: number
  spouseAllowance?: string
  childCount?: number
  parentSupportCount?: number
  lifeInsurancePremium?: string
  healthInsurancePremium?: string
  providentFundAmount?: string
  mortgageInterest?: string
  rmfAmount?: string
  ssfAmount?: string
  otherDeductions?: string
  isManualOverride?: boolean
  manualTaxAmount?: string
}

// ─────────────────────────────────────────────────────────────
// SECTION 7 — RICH RESPONSE TYPES (JOIN results)
// ─────────────────────────────────────────────────────────────

export type EmployeeWithRelations = Employee & {
  department: Department | null
  position: Position | null
  manager: Pick<Employee, 'id' | 'code' | 'firstnameTh' | 'lastnameTh'> | null
}

export type LeaveRequestWithRelations = LeaveRequest & {
  employee: Pick<Employee, 'id' | 'code' | 'firstnameTh' | 'lastnameTh'>
  leaveType: LeaveType
  approver: Pick<Employee, 'id' | 'firstnameTh' | 'lastnameTh'> | null
}

export type PayslipWithItems = Payslip & {
  employee: Pick<Employee, 'id' | 'code' | 'firstnameTh' | 'lastnameTh' | 'bankName' | 'bankAccountNumber' | 'bankAccountName'>
  items: PayslipItem[]
}

export type PayrollRunSummary = PayrollRun & {
  payslipCount: number
}
