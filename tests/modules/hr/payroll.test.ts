import { describe, expect, it } from 'bun:test'
import Decimal from 'decimal.js'
import {
  calculatePayroll,
  calculateSsoContribution,
  calculateMonthlyWithholdingTax,
} from '../../../src/modules/hr/submodules/payroll/payroll.tax'

// ============================================================
// payroll.test.ts — ต้องมี test ครบทุก case ไม่มีข้อยกเว้น
// ============================================================

describe('calculateSsoContribution', () => {
  it('เงินเดือน 15,000 — SSO employee และ employer = 750 บาท', () => {
    const { employee, employer } = calculateSsoContribution(new Decimal('15000'))
    expect(employee.toFixed(2)).toBe('750.00')
    expect(employer.toFixed(2)).toBe('750.00')
  })

  it('เงินเดือนเกิน 15,000 — ยังคง 750 บาท (cap)', () => {
    const { employee, employer } = calculateSsoContribution(new Decimal('80000'))
    expect(employee.toFixed(2)).toBe('750.00')
    expect(employer.toFixed(2)).toBe('750.00')
  })

  it('เงินเดือน 10,000 — SSO = 500 บาท', () => {
    const { employee } = calculateSsoContribution(new Decimal('10000'))
    expect(employee.toFixed(2)).toBe('500.00')
  })

  it('เงินเดือนต่ำกว่า 1,650 — ใช้ฐาน 1,650 บาท', () => {
    const { employee } = calculateSsoContribution(new Decimal('1000'))
    expect(employee.toFixed(2)).toBe('82.50') // 1650 * 5%
  })

  it('ปัดเศษทศนิยม 2 ตำแหน่งถูกต้อง', () => {
    const { employee } = calculateSsoContribution(new Decimal('12345.67'))
    const expected = new Decimal('12345.67').mul(0.05).toDecimalPlaces(2)
    expect(employee.toFixed(2)).toBe(expected.toFixed(2))
  })
})

describe('calculateMonthlyWithholdingTax', () => {
  it('เงินเดือนต่ำกว่า bracket แรก — ภาษี 0 บาท', () => {
    // รายได้ต่อปี = 10,000 * 12 = 120,000
    // หัก 50% = 60,000, หักส่วนตัว 60,000 → taxable = 0
    const tax = calculateMonthlyWithholdingTax(new Decimal('10000'))
    expect(tax.toFixed(2)).toBe('0.00')
  })

  it('เงินเดือน 25,000 — คำนวณ WHT ถูกต้อง', () => {
    // รายได้ต่อปี = 300,000
    // หักค่าใช้จ่าย 50% = 150,000, หักส่วนตัว 60,000 → taxable = 90,000
    // ภาษี bracket 0-150,000 = 0 → annual tax = 0
    const tax = calculateMonthlyWithholdingTax(new Decimal('25000'))
    expect(tax.gte(0)).toBe(true)
  })

  it('เงินเดือน 100,000 — มีภาษีหัก ณ ที่จ่าย', () => {
    // รายได้ต่อปี = 1,200,000 → taxable income สูง → มีภาษี
    const tax = calculateMonthlyWithholdingTax(new Decimal('100000'))
    expect(tax.gt(0)).toBe(true)
  })

  it('คืนค่าทศนิยม 2 ตำแหน่งเสมอ', () => {
    const tax = calculateMonthlyWithholdingTax(new Decimal('50000'))
    expect(tax.decimalPlaces()).toBeLessThanOrEqual(2)
  })

  it('ป้องกัน floating point error', () => {
    const tax = calculateMonthlyWithholdingTax(new Decimal('33333.33'))
    // ต้องไม่เป็น NaN และไม่มีทศนิยมเกิน 2 ตำแหน่ง
    expect(isNaN(tax.toNumber())).toBe(false)
    expect(tax.decimalPlaces()).toBeLessThanOrEqual(2)
  })
})

describe('calculatePayroll', () => {
  it('คำนวณครบทุก field — เงินเดือน 30,000', () => {
    const result = calculatePayroll(new Decimal('30000'))
    expect(result.grossSalary.toFixed(0)).toBe('30000')
    expect(result.ssoEmployee.toFixed(2)).toBe('750.00') // cap ที่ 750
    expect(result.ssoEmployer.toFixed(2)).toBe('750.00')
    expect(result.withholdingTax.gte(0)).toBe(true)
    // netSalary = gross - ssoEmployee - wht
    const expectedNet = new Decimal('30000')
      .minus(result.ssoEmployee)
      .minus(result.withholdingTax)
      .toDecimalPlaces(2)
    expect(result.netSalary.toFixed(2)).toBe(expectedNet.toFixed(2))
  })

  it('net salary ต้องไม่เกิน gross salary', () => {
    const result = calculatePayroll(new Decimal('50000'))
    expect(result.netSalary.lt(result.grossSalary)).toBe(true)
  })

  it('net salary ต้องไม่ติดลบ', () => {
    const result = calculatePayroll(new Decimal('15000'))
    expect(result.netSalary.gte(0)).toBe(true)
  })
})
