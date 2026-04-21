import Decimal from 'decimal.js'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { employees, payrollRuns, payslips, ssRecords } from '../../hr.schema'
import type { PayrollRun, PayrollRunSummary, Payslip } from '../../hr.types'
import { calculatePayroll } from './payroll.tax'

// ============================================================
// payroll.service.ts — business logic เกี่ยวกับการคำนวณเงินเดือน
//
// Flow: createRun → processRun → approveRun → markPaid
// ============================================================

export const PayrollService = {
  /**
   * สร้าง payroll run ใหม่ (status: draft)
   */
  async createRun(periodMonth: number, periodYear: number): Promise<PayrollRun> {
    const existing = await db.query.payrollRuns.findFirst({
      where: and(
        eq(payrollRuns.periodMonth, periodMonth),
        eq(payrollRuns.periodYear, periodYear)
      ),
    })
    if (existing) {
      throw new ValidationError({
        period: [`มี payroll run ${periodMonth}/${periodYear} อยู่แล้ว`],
      })
    }

    const [run] = await db
      .insert(payrollRuns)
      .values({ periodMonth, periodYear, status: 'draft' })
      .returning()

    if (!run) throw new Error('ไม่สามารถสร้าง payroll run ได้')
    return run
  },

  /**
   * คำนวณ payroll สำหรับพนักงาน active ทั้งหมดใน run
   * - คำนวณ SSO + WHT + net salary ต่อคน
   * - สร้าง payslips + ss_records
   * - อัปเดต status → processing
   */
  async processRun(runId: string): Promise<PayrollRunSummary> {
    const run = await db.query.payrollRuns.findFirst({
      where: eq(payrollRuns.id, runId),
    })
    if (!run) throw new NotFoundError('payroll run')

    if (run.status !== 'draft') {
      throw new ValidationError({
        status: [`ไม่สามารถประมวลผล run ที่มีสถานะ '${run.status}' ได้`],
      })
    }

    // ดึงพนักงาน active + enrolled ss ทั้งหมด
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.status, 'active'))

    if (activeEmployees.length === 0) {
      throw new ValidationError({ employees: ['ไม่มีพนักงาน active ในระบบ'] })
    }

    // คำนวณวันทำงานในเดือน (Mon-Fri อย่างง่าย — ปรับได้ด้วย work_schedules)
    const workingDaysInMonth = getWorkingDaysInMonth(run.periodYear, run.periodMonth)

    // สร้าง payslips + ss_records รายคน
    const payslipsToInsert = activeEmployees.map((emp) => {
      const gross = new Decimal(emp.baseSalary)
      const calc = calculatePayroll(gross)

      return {
        payrollRunId: runId,
        employeeId: emp.id,
        workingDaysInMonth,
        actualWorkingDays: String(workingDaysInMonth),
        absentDays: '0',
        baseSalary: emp.baseSalary,
        overtimeAmount: '0',
        allowanceTotal: '0',
        bonusTotal: '0',
        grossSalary: calc.grossSalary.toString(),
        ssDeduction: calc.ssoEmployee.toString(),
        incomeTaxDeduction: calc.withholdingTax.toString(),
        otherDeductions: '0',
        netSalary: calc.netSalary.toString(),
        taxCalculationMode: 'auto' as const,
      }
    })

    const insertedPayslips = await db.insert(payslips).values(payslipsToInsert).returning()

    // สร้าง ss_records รายคน (เฉพาะที่ ss_enrolled = true)
    const ssToInsert = activeEmployees
      .filter((emp) => emp.ssEnrolled)
      .map((emp) => {
        const gross = new Decimal(emp.baseSalary)
        const calc = calculatePayroll(gross)
        const cappedBase = Decimal.min(
          Decimal.max(gross, new Decimal(1_650)),
          new Decimal(15_000)
        )
        const contribution = cappedBase.mul('0.05').toDecimalPlaces(2)
        const payslip = insertedPayslips.find((p) => p.employeeId === emp.id)

        return {
          employeeId: emp.id,
          periodMonth: run.periodMonth,
          periodYear: run.periodYear,
          baseSalary: emp.baseSalary,
          cappedBase: cappedBase.toString(),
          employeeContribution: contribution.toString(),
          employerContribution: contribution.toString(),
          totalContribution: contribution.mul(2).toString(),
          payslipId: payslip?.id ?? null,
          isEnrolled: true,
        }
      })

    if (ssToInsert.length > 0) {
      await db.insert(ssRecords).values(ssToInsert)
    }

    // คำนวณ totals
    const totals = insertedPayslips.reduce(
      (acc: { grossSalary: string; ssDeduction: string; incomeTaxDeduction: string; netSalary: string; count: number }, item) => ({
        grossSalary: new Decimal(acc.grossSalary).plus(item.grossSalary).toString(),
        ssDeduction: new Decimal(acc.ssDeduction).plus(item.ssDeduction).toString(),
        incomeTaxDeduction: new Decimal(acc.incomeTaxDeduction).plus(item.incomeTaxDeduction).toString(),
        netSalary: new Decimal(acc.netSalary).plus(item.netSalary).toString(),
        count: acc.count + 1,
      }),
      { grossSalary: '0', ssDeduction: '0', incomeTaxDeduction: '0', netSalary: '0', count: 0 }
    )

    const totalGross = totals.grossSalary
    const totalDeductions = new Decimal(totals.ssDeduction).plus(totals.incomeTaxDeduction).toString()
    const totalNet = totals.netSalary

    // อัปเดต run: status → processing + totals
    const [updatedRun] = await db
      .update(payrollRuns)
      .set({
        status: 'processing',
        processedAt: new Date(),
        totalGross,
        totalDeductions,
        totalNet,
        updatedAt: new Date(),
      })
      .where(eq(payrollRuns.id, runId))
      .returning()

    if (!updatedRun) throw new Error('อัปเดต payroll run ไม่สำเร็จ')

    return { ...updatedRun, payslipCount: insertedPayslips.length }
  },

  /**
   * อนุมัติ payroll run (processing → approved)
   */
  async approveRun(runId: string, approvedBy: string): Promise<PayrollRun> {
    const run = await db.query.payrollRuns.findFirst({
      where: eq(payrollRuns.id, runId),
    })
    if (!run) throw new NotFoundError('payroll run')

    if (run.status !== 'processing') {
      throw new ValidationError({
        status: [`ต้องอยู่ในสถานะ 'processing' ก่อนอนุมัติ`],
      })
    }

    const [updated] = await db
      .update(payrollRuns)
      .set({ status: 'approved', approvedBy, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(payrollRuns.id, runId))
      .returning()

    if (!updated) throw new NotFoundError('payroll run')
    return updated
  },

  /**
   * บันทึกว่าจ่ายเงินเดือนแล้ว (approved → paid)
   */
  async markPaid(runId: string): Promise<PayrollRun> {
    const run = await db.query.payrollRuns.findFirst({
      where: eq(payrollRuns.id, runId),
    })
    if (!run) throw new NotFoundError('payroll run')

    if (run.status !== 'approved') {
      throw new ValidationError({
        status: [`ต้องอยู่ในสถานะ 'approved' ก่อนบันทึกการจ่าย`],
      })
    }

    const [updated] = await db
      .update(payrollRuns)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(payrollRuns.id, runId))
      .returning()

    if (!updated) throw new NotFoundError('payroll run')
    return updated
  },

  /**
   * ดึงรายการ payroll runs ทั้งหมด
   */
  async listRuns(): Promise<PaginatedResult<PayrollRunSummary>> {
    const runs = await db
      .select({
        id: payrollRuns.id,
        periodMonth: payrollRuns.periodMonth,
        periodYear: payrollRuns.periodYear,
        status: payrollRuns.status,
        totalGross: payrollRuns.totalGross,
        totalDeductions: payrollRuns.totalDeductions,
        totalNet: payrollRuns.totalNet,
        processedAt: payrollRuns.processedAt,
        approvedBy: payrollRuns.approvedBy,
        approvedAt: payrollRuns.approvedAt,
        paidAt: payrollRuns.paidAt,
        createdBy: payrollRuns.createdBy,
        createdAt: payrollRuns.createdAt,
        updatedAt: payrollRuns.updatedAt,
        payslipCount: sql<number>`(
          SELECT COUNT(*) FROM payslips WHERE payslips.payroll_run_id = ${payrollRuns.id}
        )`.mapWith(Number),
      })
      .from(payrollRuns)
      .orderBy(payrollRuns.periodYear, payrollRuns.periodMonth)

    return {
      data: runs,
      meta: { page: 1, perPage: runs.length, total: runs.length, totalPages: 1 },
    }
  },

  /**
   * ดึง payslips ทั้งหมดใน run
   */
  async getPayslipsByRun(runId: string): Promise<Payslip[]> {
    return db.select().from(payslips).where(eq(payslips.payrollRunId, runId))
  },

  /**
   * รายการ payslip แบบ flatten สำหรับ UI (ร่วม run + employee)
   */
  async listPayslipsForApi(query: {
    page?: number
    perPage?: number
    period?: string
    employeeId?: string
  }): Promise<
    PaginatedResult<{
      id: string
      employeeId: string
      employeeCode: string
      employeeName: string
      period: string
      baseSalary: number
      otHours: number
      otAmount: number
      deductions: number
      netSalary: number
      status: 'draft' | 'approved' | 'paid'
      paidAt?: string
      createdAt: string
      updatedAt: string
    }>
  > {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = []
    if (query.employeeId) conditions.push(eq(payslips.employeeId, query.employeeId))
    if (query.period) {
      const parts = query.period.split('-')
      const y = Number(parts[0])
      const m = Number(parts[1])
      if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
        conditions.push(eq(payrollRuns.periodYear, y))
        conditions.push(eq(payrollRuns.periodMonth, m))
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countRow] = await db
      .select({ c: count() })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
      .where(whereClause)

    const total = Number(countRow?.c ?? 0)

    const rows = await db
      .select({
        slip: payslips,
        run: payrollRuns,
        code: employees.code,
        firstnameTh: employees.firstnameTh,
        lastnameTh: employees.lastnameTh,
      })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payslips.payrollRunId, payrollRuns.id))
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(payrollRuns.periodYear), desc(payrollRuns.periodMonth), employees.code)
      .limit(perPage)
      .offset(offset)

    const data = rows.map(({ slip, run, code, firstnameTh, lastnameTh }) => {
      const ss = new Decimal(slip.ssDeduction ?? '0')
      const tax = new Decimal(slip.incomeTaxDeduction ?? '0')
      const other = new Decimal(slip.otherDeductions ?? '0')
      const deductions = ss.plus(tax).plus(other).toNumber()
      const otAmount = Number(slip.overtimeAmount ?? '0')

      let status: 'draft' | 'approved' | 'paid' = 'draft'
      if (run.status === 'approved') status = 'approved'
      if (run.status === 'paid') status = 'paid'
      if (run.status === 'draft' || run.status === 'processing') status = 'draft'

      const period = `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`

      const row: {
        id: string
        employeeId: string
        employeeCode: string
        employeeName: string
        period: string
        baseSalary: number
        otHours: number
        otAmount: number
        deductions: number
        netSalary: number
        status: 'draft' | 'approved' | 'paid'
        paidAt?: string
        createdAt: string
        updatedAt: string
      } = {
        id: slip.id,
        employeeId: slip.employeeId,
        employeeCode: code,
        employeeName: `${firstnameTh} ${lastnameTh}`.trim(),
        period,
        baseSalary: Number(slip.baseSalary),
        otHours: 0,
        otAmount,
        deductions,
        netSalary: Number(slip.netSalary),
        status,
        createdAt: slip.createdAt.toISOString(),
        updatedAt: slip.createdAt.toISOString(),
      }
      if (run.paidAt) row.paidAt = run.paidAt.toISOString()
      return row
    })

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  },
}

// ─────────────────────────────────────────────────────────────
// Helper: นับวันทำงาน Mon-Fri ในเดือน
// ─────────────────────────────────────────────────────────────
function getWorkingDaysInMonth(year: number, month: number): number {
  // month: 1-12
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay()
    // 0 = อาทิตย์, 6 = เสาร์
    if (day !== 0 && day !== 6) count++
  }
  return count
}
