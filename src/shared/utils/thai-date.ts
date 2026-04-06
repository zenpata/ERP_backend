// ============================================================
// thai-date.ts — แปลงวันที่ ค.ศ. ↔ พ.ศ.
// เก็บในฐานข้อมูลเป็น ค.ศ. เสมอ แปลงเป็น พ.ศ. เฉพาะตอน response
// ============================================================

const BUDDHIST_ERA_OFFSET = 543

/**
 * แปลงปี ค.ศ. เป็นปี พ.ศ.
 */
export function toBuddhistYear(date: Date): number {
  return date.getFullYear() + BUDDHIST_ERA_OFFSET
}

/**
 * แปลงปี พ.ศ. เป็นปี ค.ศ.
 */
export function fromBuddhistYear(buddhistYear: number): number {
  return buddhistYear - BUDDHIST_ERA_OFFSET
}

/**
 * Format วันที่เป็น string แบบไทย เช่น "1 มกราคม 2568"
 */
export function formatThaiDate(date: Date): string {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ]
  const day = date.getDate()
  const month = thaiMonths[date.getMonth()] ?? ''
  const year = toBuddhistYear(date)
  return `${day} ${month} ${year}`
}

/**
 * Format วันที่เป็น string แบบ short เช่น "01/01/2568"
 */
export function formatThaiDateShort(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = toBuddhistYear(date)
  return `${day}/${month}/${year}`
}

/**
 * แปลงวันที่จาก string พ.ศ. (dd/mm/yyyy) เป็น Date object (ค.ศ.)
 */
export function parseThaiDateShort(dateStr: string): Date {
  const [dayStr, monthStr, yearStr] = dateStr.split('/')
  if (!dayStr || !monthStr || !yearStr) {
    throw new Error(`Invalid Thai date format: ${dateStr}`)
  }
  const year = fromBuddhistYear(parseInt(yearStr, 10))
  const month = parseInt(monthStr, 10) - 1
  const day = parseInt(dayStr, 10)
  return new Date(year, month, day)
}
