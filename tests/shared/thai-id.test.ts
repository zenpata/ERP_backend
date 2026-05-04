import { describe, expect, it } from 'bun:test'
import { validateNationalId, formatNationalId } from '../../src/shared/utils/thai-id'

describe('thai-id utils', () => {
  describe('validateNationalId', () => {
    it('ตรวจสอบเลขที่ถูกต้อง', () => {
      // 1234567890121 ผ่าน checksum (sum=352, mod11=0, check=1 = digit 13)
      expect(validateNationalId('1234567890121')).toBe(true)
      // เปลี่ยน checksum digit ให้ผิด → ต้อง return false
      expect(validateNationalId('1234567890120')).toBe(false)
    })

    it('ปฏิเสธเลขที่มีตัวอักษร', () => {
      expect(validateNationalId('123456789012A')).toBe(false)
    })

    it('ปฏิเสธเลขที่ไม่ครบ 13 หลัก', () => {
      expect(validateNationalId('123456789012')).toBe(false)
      expect(validateNationalId('12345678901234')).toBe(false)
    })

    it('ปฏิเสธ string ว่าง', () => {
      expect(validateNationalId('')).toBe(false)
    })
  })

  describe('formatNationalId', () => {
    it('format เลข 13 หลักถูกต้อง', () => {
      expect(formatNationalId('1234567890121')).toBe('1-2345-67890-12-1')
    })

    it('คืนค่าเดิมถ้าไม่ใช่ 13 หลัก', () => {
      expect(formatNationalId('123')).toBe('123')
    })
  })
})
