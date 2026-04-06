import Decimal from 'decimal.js'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { employees, payrollItems, payrollPeriods } from '../../hr.schema'
import { calculatePayroll } from './payroll.tax'

// ============================================================
// payroll.service.ts — business logic เกี่ยวกับการคำนวณเงินเดือน
// ============================================================

export type PayrollPeriodStatus = 'draft' | 'processing' | 'approved' | 'paid'

export type PayrollPeriod = {
  id: string
  year: number
  month: number
  status: PayrollPeriodStatus
  processedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PayrollItem = {
  id: string
  periodId: string
  employeeId: string
  grossSalary: string
  ssoEmployee: string
  ssoEmployer: string
  withholdingTax: string
  netSalary: string
  createdAt: Date
  updatedAt: Date
}

export type PayrollSummary = {
  period: PayrollPeriod
  items: PayrollItem[]
  totals: {
    grossSalary: string
    ssoEmployee: string
    ssoEmployer: string
    withholdingTax: string
    netSalary: string
    employeeCount: number
  }
}

export const PayrollService = {
  /**
   * สร้าง payroll period ใหม่
   */
  async createPeriod(year: number, month: number): Promise<PayrollPeriod> {
    // ตรวจสอบว่ายังไม่มี period นี้
    const existing = await db.query.payrollPeriods.findFirst({
      where: and(
        eq(payrollPeriods.year, String(year)),
        eq(payrollPeriods.month, String(month))
      ),
    })
    if (existing) {
      throw new ValidationError({
        period: [`มี payroll period ${month}/${year} อยู่แล้ว`],
      })
    }

    const [period] = await db
      .insert(payrollPeriods)
      .values({
        year: String(year),
        month: String(month),
        status: 'draft',
      })
      .returning()

    if (!period) throw new Error('ไม่สามารถสร้าง payroll period ได้')
    return period as unknown as PayrollPeriod
  },

  /**
   * คำนวณ payroll สำหรับทุกพนักงานใน period
   * - ดึงข้อมูลพนักงาน active ทั้งหมด
   * - คำนวณ SSO + WHT + net salary
   * - บันทึก payroll items
   */
  async processPeriod(periodId: string): Promise<PayrollSummary> {
    const period = await db.query.payrollPeriods.findFirst({
      where: eq(payrollPeriods.id, periodId),
    })
    if (!period) throw new NotFoundError('payroll period')

    if (period.status !== 'draft') {
      throw new ValidationError({
        status: [`ไม่สามารถคำนวณ period ที่มีสถานะ '${period.status}' ได้`],
      })
    }

    // ดึงพนักงาน active ทั้งหมด
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.status, 'active'))

    if (activeEmployees.length === 0) {
      throw new ValidationError({ employees: ['ไม่มีพนักงาน active ในระบบ'] })
    }

    // ลบ items เก่าถ้ามี (สำหรับ re-process)
    // await db.delete(payrollItems).where(eq(payrollItems.periodId, periodId))

    // คำนวณและบันทึก payroll items
    const itemsToInsert = activeEmployees.map((emp) => {
      const gross = new Decimal(emp.baseSalary)
      const calc = calculatePayroll(gross)

      return {
        periodId,
        employeeId: emp.id,
        grossSalary: calc.grossSalary.toString(),
        ssoEmployee: calc.ssoEmployee.toString(),
        ssoEmployer: calc.ssoEmployer.toString(),
        withholdingTax: calc.withholdingTax.toString(),
        netSalary: calc.netSalary.toString(),
      }
    })

    const insertedItems = await db.insert(payrollItems).values(itemsToInsert).returning()

    // อัปเดต status เป็น processing
    await db
      .update(payrollPeriods)
      .set({ status: 'processing', processedAt: new Date(), updatedAt: new Date() })
      .where(eq(payrollPeriods.id, periodId))

    // คำนวณ totals
    const totals = insertedItems.reduce(
      (acc, item) => ({
        grossSalary: new Decimal(acc.grossSalary).plus(item.grossSalary).toString(),
        ssoEmployee: new Decimal(acc.ssoEmployee).plus(item.ssoEmployee).toString(),
        ssoEmployer: new Decimal(acc.ssoEmployer).plus(item.ssoEmployer).toString(),
        withholdingTax: new Decimal(acc.withholdingTax).plus(item.withholdingTax).toString(),
        netSalary: new Decimal(acc.netSalary).plus(item.netSalary).toString(),
        employeeCount: acc.employeeCount + 1,
      }),
      {
        grossSalary: '0',
        ssoEmployee: '0',
        ssoEmployer: '0',
        withholdingTax: '0',
        netSalary: '0',
        employeeCount: 0,
      }
    )

    return {
      period: { ...period, status: 'processing' } as unknown as PayrollPeriod,
      items: insertedItems as unknown as PayrollItem[],
      totals,
    }
  },

  /**
   * ดึงสรุป payroll ของ period
   */
  async getPeriodSummary(periodId: string): Promise<PayrollSummary> {
    const period = await db.query.payrollPeriods.findFirst({
      where: eq(payrollPeriods.id, periodId),
    })
    if (!period) throw new NotFoundError('payroll period')

    const items = await db
      .select()
      .from(payrollItems)
      .where(eq(payrollItems.periodId, periodId))

    const totals = items.reduce(
      (acc, item) => ({
        grossSalary: new Decimal(acc.grossSalary).plus(item.grossSalary).toString(),
        ssoEmployee: new Decimal(acc.ssoEmployee).plus(item.ssoEmployee).toString(),
        ssoEmployer: new Decimal(acc.ssoEmployer).plus(item.ssoEmployer).toString(),
        withholdingTax: new Decimal(acc.withholdingTax).plus(item.withholdingTax).toString(),
        netSalary: new Decimal(acc.netSalary).plus(item.netSalary).toString(),
        employeeCount: acc.employeeCount + 1,
      }),
      {
        grossSalary: '0',
        ssoEmployee: '0',
        ssoEmployer: '0',
        withholdingTax: '0',
        netSalary: '0',
        employeeCount: 0,
      }
    )

    return {
      period: period as unknown as PayrollPeriod,
      items: items as unknown as PayrollItem[],
      totals,
    }
  },
}
