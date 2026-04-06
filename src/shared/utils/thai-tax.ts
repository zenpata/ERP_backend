import Decimal from 'decimal.js'

// ============================================================
// thai-tax.ts — ค่าคงที่และฟังก์ชันภาษีไทย
// อ้างอิง: ประมวลรัษฎากร มาตรา 40 / พ.ร.บ. ประกันสังคม
// ============================================================

export const VAT_RATE = 0.07 // VAT 7% คงที่

// WHT rates ตามประเภทรายได้ (มาตรา 40)
export const WHT_RATES = {
  SERVICE: 0.03,   // ค่าบริการทั่วไป
  RENT: 0.05,      // ค่าเช่า
  INTEREST: 0.01,  // ดอกเบี้ย
  DIVIDEND: 0.10,  // เงินปันผล
  FREELANCE: 0.03, // ค่าจ้างอิสระ
} as const

export type WhtType = keyof typeof WHT_RATES

// ประกันสังคม
export const SSO_RATE = 0.05           // 5% ทั้ง employer และ employee
export const SSO_MAX_SALARY = 15_000   // คำนวณจากเงินเดือนสูงสุด 15,000 บาท
export const SSO_MAX_CONTRIBUTION = SSO_MAX_SALARY * SSO_RATE // 750 บาท/เดือน

/**
 * คำนวณ VAT 7% จาก subtotal
 */
export function calculateVat(subtotal: Decimal): Decimal {
  return subtotal.mul(VAT_RATE).toDecimalPlaces(2)
}

/**
 * คำนวณ WHT ตามประเภทรายได้
 */
export function calculateWht(amount: Decimal, type: WhtType): Decimal {
  return amount.mul(WHT_RATES[type]).toDecimalPlaces(2)
}

/**
 * คำนวณเงินสมทบประกันสังคมของ employee หรือ employer
 * - ฐานเงินเดือนสูงสุด 15,000 บาท
 * - อัตรา 5%
 */
export function calculateSso(grossSalary: Decimal): Decimal {
  const base = Decimal.min(grossSalary, new Decimal(SSO_MAX_SALARY))
  return base.mul(SSO_RATE).toDecimalPlaces(2)
}

/**
 * คำนวณราคาพร้อม VAT
 */
export function calculateTotalWithVat(subtotal: Decimal): {
  subtotal: Decimal
  vatAmount: Decimal
  total: Decimal
} {
  const vatAmount = calculateVat(subtotal)
  const total = subtotal.plus(vatAmount)
  return { subtotal, vatAmount, total }
}
