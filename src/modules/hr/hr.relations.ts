import { relations } from 'drizzle-orm'
import {
  attendanceRecords,
  allowanceTypes,
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
// hr.relations.ts — Drizzle relations สำหรับ HR module
//
// ใช้กับ db.query API (relational queries)
// ไม่กระทบ DB schema — drizzle-kit จะไม่ generate migration จากไฟล์นี้
// ============================================================

// ─────────────────────────────────────────────────────────────
// SECTION 1 — ORGANIZATION
// ─────────────────────────────────────────────────────────────

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  // หน่วยงานแม่
  parent: one(departments, {
    fields: [departments.parentId],
    references: [departments.id],
    relationName: 'departmentHierarchy',
  }),
  children: many(departments, { relationName: 'departmentHierarchy' }),
  // หัวหน้าหน่วยงาน (forward-ref ไปยัง employees)
  manager: one(employees, {
    fields: [departments.managerId],
    references: [employees.id],
    relationName: 'departmentManager',
  }),
  positions: many(positions),
  employees: many(employees),
}))

export const positionsRelations = relations(positions, ({ one, many }) => ({
  department: one(departments, {
    fields: [positions.departmentId],
    references: [departments.id],
  }),
  employees: many(employees),
}))

// ─────────────────────────────────────────────────────────────
// SECTION 2 — AUTH
// ─────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
  userRoles: many(userRoles, { relationName: 'userRoleUser' }),
  // payroll runs ที่ approve / สร้าง
  approvedPayrollRuns: many(payrollRuns, { relationName: 'payrollApprover' }),
  createdPayrollRuns: many(payrollRuns, { relationName: 'payrollCreator' }),
  // ss submissions ที่ยื่น
  ssSubmissions: many(ssSubmissions),
  // attendance ที่แก้ไข
  editedAttendance: many(attendanceRecords),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
    relationName: 'userRoleUser',
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
    relationName: 'roleAssigner',
  }),
}))

// ─────────────────────────────────────────────────────────────
// SECTION 3 — EMPLOYEES
// ─────────────────────────────────────────────────────────────

export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  position: one(positions, {
    fields: [employees.positionId],
    references: [positions.id],
  }),
  // หัวหน้างาน (self-ref)
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: 'employeeHierarchy',
  }),
  subordinates: many(employees, { relationName: 'employeeHierarchy' }),
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  // Leave
  leaveRequests: many(leaveRequests, { relationName: 'leaveRequester' }),
  approvedLeaveRequests: many(leaveRequests, { relationName: 'leaveApprover' }),
  leaveBalances: many(leaveBalances),
  // Attendance
  attendanceRecords: many(attendanceRecords),
  employeeSchedules: many(employeeSchedules),
  overtimeRequests: many(overtimeRequests, { relationName: 'otRequester' }),
  approvedOvertimeRequests: many(overtimeRequests, { relationName: 'otApprover' }),
  // Payroll
  payslips: many(payslips),
  taxSettings: many(employeeTaxSettings),
  // Social Security
  ssRecords: many(ssRecords),
  // ถูกตั้งเป็น departmentManager ของแผนกไหนบ้าง
  managedDepartments: many(departments, { relationName: 'departmentManager' }),
}))

// ─────────────────────────────────────────────────────────────
// SECTION 4 — LEAVE
// ─────────────────────────────────────────────────────────────

export const leaveTypesRelations = relations(leaveTypes, ({ many }) => ({
  leaveApprovalConfigs: many(leaveApprovalConfigs),
  leaveBalances: many(leaveBalances),
  leaveRequests: many(leaveRequests),
}))

export const leaveApprovalConfigsRelations = relations(leaveApprovalConfigs, ({ one }) => ({
  leaveType: one(leaveTypes, {
    fields: [leaveApprovalConfigs.leaveTypeId],
    references: [leaveTypes.id],
  }),
}))

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveBalances.employeeId],
    references: [employees.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveBalances.leaveTypeId],
    references: [leaveTypes.id],
  }),
}))

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
    relationName: 'leaveRequester',
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveRequests.leaveTypeId],
    references: [leaveTypes.id],
  }),
  approver: one(employees, {
    fields: [leaveRequests.approverId],
    references: [employees.id],
    relationName: 'leaveApprover',
  }),
}))

// ─────────────────────────────────────────────────────────────
// SECTION 5 — ATTENDANCE
// ─────────────────────────────────────────────────────────────

export const workSchedulesRelations = relations(workSchedules, ({ many }) => ({
  employeeSchedules: many(employeeSchedules),
}))

export const employeeSchedulesRelations = relations(employeeSchedules, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeSchedules.employeeId],
    references: [employees.id],
  }),
  workSchedule: one(workSchedules, {
    fields: [employeeSchedules.workScheduleId],
    references: [workSchedules.id],
  }),
}))

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceRecords.employeeId],
    references: [employees.id],
  }),
  editor: one(users, {
    fields: [attendanceRecords.editedBy],
    references: [users.id],
  }),
}))

export const overtimeRequestsRelations = relations(overtimeRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [overtimeRequests.employeeId],
    references: [employees.id],
    relationName: 'otRequester',
  }),
  approver: one(employees, {
    fields: [overtimeRequests.approvedBy],
    references: [employees.id],
    relationName: 'otApprover',
  }),
}))

// ─────────────────────────────────────────────────────────────
// SECTION 6 — PAYROLL
// ─────────────────────────────────────────────────────────────

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  approver: one(users, {
    fields: [payrollRuns.approvedBy],
    references: [users.id],
    relationName: 'payrollApprover',
  }),
  creator: one(users, {
    fields: [payrollRuns.createdBy],
    references: [users.id],
    relationName: 'payrollCreator',
  }),
  payslips: many(payslips),
}))

export const payslipsRelations = relations(payslips, ({ one, many }) => ({
  payrollRun: one(payrollRuns, {
    fields: [payslips.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  items: many(payslipItems),
  ssRecord: one(ssRecords, {
    fields: [payslips.id],
    references: [ssRecords.payslipId],
  }),
}))

export const payslipItemsRelations = relations(payslipItems, ({ one }) => ({
  payslip: one(payslips, {
    fields: [payslipItems.payslipId],
    references: [payslips.id],
  }),
}))

export const employeeTaxSettingsRelations = relations(employeeTaxSettings, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeTaxSettings.employeeId],
    references: [employees.id],
  }),
}))

// ─────────────────────────────────────────────────────────────
// SECTION 7 — SOCIAL SECURITY
// ─────────────────────────────────────────────────────────────

export const ssRecordsRelations = relations(ssRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [ssRecords.employeeId],
    references: [employees.id],
  }),
  payslip: one(payslips, {
    fields: [ssRecords.payslipId],
    references: [payslips.id],
  }),
}))

export const ssSubmissionsRelations = relations(ssSubmissions, ({ one }) => ({
  submitter: one(users, {
    fields: [ssSubmissions.submittedBy],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────
// unused imports guard — ทำให้ TypeScript ไม่ฟ้อง "imported but never used"
// ─────────────────────────────────────────────────────────────
export type {
  // เพื่อให้ file นี้ใช้ทุก import (allowanceTypes, payrollConfigs, holidays ไม่มี relations)
}
void allowanceTypes
void payrollConfigs
void holidays
