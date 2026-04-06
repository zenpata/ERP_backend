import { describe, expect, it } from 'bun:test'
import {
  toBuddhistYear,
  fromBuddhistYear,
  formatThaiDate,
  formatThaiDateShort,
  parseThaiDateShort,
} from '../../src/shared/utils/thai-date'

describe('thai-date utils', () => {
  describe('toBuddhistYear', () => {
    it('2024 ค.ศ. → 2567 พ.ศ.', () => {
      expect(toBuddhistYear(new Date('2024-01-01'))).toBe(2567)
    })

    it('2000 ค.ศ. → 2543 พ.ศ.', () => {
      expect(toBuddhistYear(new Date('2000-06-15'))).toBe(2543)
    })
  })

  describe('fromBuddhistYear', () => {
    it('2567 พ.ศ. → 2024 ค.ศ.', () => {
      expect(fromBuddhistYear(2567)).toBe(2024)
    })

    it('2543 พ.ศ. → 2000 ค.ศ.', () => {
      expect(fromBuddhistYear(2543)).toBe(2000)
    })

    it('toBuddhistYear และ fromBuddhistYear เป็น inverse กัน', () => {
      const date = new Date('2025-03-20')
      expect(fromBuddhistYear(toBuddhistYear(date))).toBe(date.getFullYear())
    })
  })

  describe('formatThaiDate', () => {
    it('format วันที่ภาษาไทยถูกต้อง', () => {
      const date = new Date('2024-01-15')
      expect(formatThaiDate(date)).toBe('15 มกราคม 2567')
    })

    it('format เดือนธันวาคมถูกต้อง', () => {
      const date = new Date('2023-12-31')
      expect(formatThaiDate(date)).toBe('31 ธันวาคม 2566')
    })
  })

  describe('formatThaiDateShort', () => {
    it('format dd/mm/yyyy พ.ศ. ถูกต้อง', () => {
      const date = new Date('2024-01-05')
      expect(formatThaiDateShort(date)).toBe('05/01/2567')
    })
  })

  describe('parseThaiDateShort', () => {
    it('parse dd/mm/yyyy พ.ศ. กลับเป็น Date ค.ศ.', () => {
      const date = parseThaiDateShort('15/01/2567')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January = 0
      expect(date.getDate()).toBe(15)
    })

    it('ส่ง error ถ้า format ไม่ถูกต้อง', () => {
      expect(() => parseThaiDateShort('not-a-date')).toThrow()
    })

    it('formatThaiDateShort และ parseThaiDateShort เป็น inverse กัน', () => {
      const original = new Date('2024-06-20')
      const formatted = formatThaiDateShort(original)
      const parsed = parseThaiDateShort(formatted)
      expect(parsed.getFullYear()).toBe(original.getFullYear())
      expect(parsed.getMonth()).toBe(original.getMonth())
      expect(parsed.getDate()).toBe(original.getDate())
    })
  })
})
