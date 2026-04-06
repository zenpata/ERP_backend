import Decimal from 'decimal.js'
import {
  SSO_MAX_SALARY,
  SSO_RATE,
  SSO_MAX_CONTRIBUTION,
} from '../../../../shared/utils/thai-tax'

// ============================================================
// payroll.tax.ts — คำนวณภาษี ภ.ง.ด. และประกันสังคม
// อ้างอิง: กรมสรรพากร + สำนักงานประกันสังคม
// ============================================================

/**
 * คำนวณเงินสมทบประกันสังคม (employee + employer)
 * - ฐานเงินเดือน min 1,650 / max 15,000 บาท
 * - อัตรา 5% ทั้งสองฝ่าย
 */
export function calculateSsoContribution(grossSalary: Decimal): {
  employee: Decimal
  employer: Decimal
} {
  const SSO_MIN_SALARY = 1_650
  const base = Decimal.min(
    Decimal.max(grossSalary, new Decimal(SSO_MIN_SALARY)),
    new Decimal(SSO_MAX_SALARY)
  )
  const contribution = base.mul(SSO_RATE).toDecimalPlaces(2)
  // ไม่เกิน SSO_MAX_CONTRIBUTION
  const capped = Decimal.min(contribution, new Decimal(SSO_MAX_CONTRIBUTION))
  return { employee: capped, employer: capped }
}

/**
 * คำนวณภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) สำหรับเงินเดือนรายเดือน
 * ใช้วิธี annualize แล้ว deannualize
 * อ้างอิง: มาตรา 40(1) อัตราภาษีเงินได้บุคคลธรรมดา
 */
export function calculateMonthlyWithholdingTax(monthlySalary: Decimal): Decimal {
  // คำนวณรายได้ต่อปี (annualize)
  const annualIncome = monthlySalary.mul(12)

  // หักค่าใช้จ่าย 50% ไม่เกิน 100,000 บาท
  const expenseDeduction = Decimal.min(annualIncome.mul(0.5), new Decimal(100_000))

  // หักค่าลดหย่อนส่วนตัว 60,000 บาท
  const personalAllowance = new Decimal(60_000)

  const taxableIncome = annualIncome
    .minus(expenseDeduction)
    .minus(personalAllowance)
    .toDecimalPlaces(0)

  if (taxableIncome.lte(0)) return new Decimal('0.00')

  // อัตราภาษีแบบก้าวหน้า
  const annualTax = calculateProgressiveTax(taxableIncome)

  // หารกลับมาเป็นรายเดือน
  return annualTax.div(12).toDecimalPlaces(2)
}

/**
 * คำนวณภาษีแบบก้าวหน้า (progressive tax)
 * อัตราปัจจุบัน ณ ปี 2567
 */
function calculateProgressiveTax(taxableIncome: Decimal): Decimal {
  const brackets: Array<{ max: number; rate: number }> = [
    { max: 150_000, rate: 0 },
    { max: 300_000, rate: 0.05 },
    { max: 500_000, rate: 0.10 },
    { max: 750_000, rate: 0.15 },
    { max: 1_000_000, rate: 0.20 },
    { max: 2_000_000, rate: 0.25 },
    { max: 5_000_000, rate: 0.30 },
    { max: Infinity, rate: 0.35 },
  ]

  let tax = new Decimal(0)
  let previousMax = 0

  for (const bracket of brackets) {
    if (taxableIncome.lte(previousMax)) break

    const bracketIncome = Decimal.min(
      taxableIncome.minus(previousMax),
      new Decimal(bracket.max === Infinity ? taxableIncome.toNumber() : bracket.max - previousMax)
    )

    tax = tax.plus(bracketIncome.mul(bracket.rate))
    previousMax = bracket.max === Infinity ? taxableIncome.toNumber() : bracket.max
  }

  return tax.toDecimalPlaces(2)
}

export type PayrollCalculation = {
  grossSalary: Decimal
  ssoEmployee: Decimal
  ssoEmployer: Decimal
  withholdingTax: Decimal
  netSalary: Decimal
}

/**
 * คำนวณ payroll ครบทุกรายการ
 */
export function calculatePayroll(grossSalary: Decimal): PayrollCalculation {
  const { employee: ssoEmployee, employer: ssoEmployer } = calculateSsoContribution(grossSalary)
  const withholdingTax = calculateMonthlyWithholdingTax(grossSalary)
  const netSalary = grossSalary.minus(ssoEmployee).minus(withholdingTax).toDecimalPlaces(2)

  return { grossSalary, ssoEmployee, ssoEmployer, withholdingTax, netSalary }
}
