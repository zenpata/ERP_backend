// ============================================================
// thai-id.ts — ตรวจสอบเลขประจำตัวบุคคลและนิติบุคคลไทย
// ============================================================

/**
 * ตรวจสอบเลขประจำตัวประชาชน 13 หลัก
 * อัลกอริทึม: checksum มาตรฐานกรมการปกครอง
 */
export function validateNationalId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false

  const digits = id.split('').map(Number)
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (13 - i), 0)
  const checkDigit = (11 - (sum % 11)) % 10

  return checkDigit === digits[12]
}

/**
 * ตรวจสอบเลขประจำตัวนิติบุคคล 13 หลัก
 * รูปแบบ: X-XXXX-XXXXX-XX-X
 * ใช้ checksum algorithm เดียวกับ validateNationalId
 */
export function validateJuristicId(id: string): boolean {
  const cleaned = id.replace(/-/g, '')
  if (!/^\d{13}$/.test(cleaned)) return false

  // นิติบุคคลขึ้นต้นด้วย 0
  if (cleaned[0] !== '0') return false

  // checksum: algorithm เดียวกับเลขประชาชน (กรมพัฒนาธุรกิจการค้าใช้ algorithm เดียวกัน)
  const digits = cleaned.split('').map(Number)
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (13 - i), 0)
  const checkDigit = (11 - (sum % 11)) % 10
  return checkDigit === digits[12]
}

/**
 * Format เลข 13 หลักเป็น X-XXXX-XXXXX-XX-X
 */
export function formatNationalId(id: string): string {
  if (id.length !== 13) return id
  return `${id[0]}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id[12]}`
}
