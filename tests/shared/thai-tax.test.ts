import { describe, expect, it } from 'bun:test'
import Decimal from 'decimal.js'
import {
  calculateVat,
  calculateWht,
  calculateTotalWithVat,
  calculateSso,
  VAT_RATE,
  SSO_RATE,
  SSO_MAX_CONTRIBUTION,
} from '../../src/shared/utils/thai-tax'

describe('thai-tax utils', () => {
  describe('calculateVat', () => {
    it('คำนวณ VAT 7% จาก 100 บาท', () => {
      const result = calculateVat(new Decimal('100.00'))
      expect(result.toString()).toBe('7.00')
    })

    it('ป้องกัน floating point error — 0.1 * 0.07', () => {
      const result = calculateVat(new Decimal('0.1'))
      expect(result.toString()).toBe('0.01')
    })

    it('คำนวณ VAT จาก 1,000,000 บาท', () => {
      const result = calculateVat(new Decimal('1000000.00'))
      expect(result.toString()).toBe('70000.00')
    })

    it('ปัดเศษทศนิยม 2 ตำแหน่ง', () => {
      const result = calculateVat(new Decimal('333.33'))
      expect(result.toString()).toBe('23.33')
    })
  })

  describe('calculateWht', () => {
    it('WHT SERVICE 3% จาก 100,000 บาท', () => {
      const result = calculateWht(new Decimal('100000.00'), 'SERVICE')
      expect(result.toString()).toBe('3000.00')
    })

    it('WHT RENT 5% จาก 50,000 บาท', () => {
      const result = calculateWht(new Decimal('50000.00'), 'RENT')
      expect(result.toString()).toBe('2500.00')
    })

    it('WHT DIVIDEND 10% จาก 200,000 บาท', () => {
      const result = calculateWht(new Decimal('200000.00'), 'DIVIDEND')
      expect(result.toString()).toBe('20000.00')
    })
  })

  describe('calculateTotalWithVat', () => {
    it('คำนวณ subtotal + VAT ครบถ้วน', () => {
      const { subtotal, vatAmount, total } = calculateTotalWithVat(new Decimal('1000.00'))
      expect(subtotal.toString()).toBe('1000')
      expect(vatAmount.toString()).toBe('70.00')
      expect(total.toString()).toBe('1070.00')
    })
  })

  describe('calculateSso', () => {
    it('เงินเดือน 15,000 บาท — SSO สูงสุด 750 บาท', () => {
      const result = calculateSso(new Decimal('15000.00'))
      expect(result.toString()).toBe(SSO_MAX_CONTRIBUTION.toFixed(2))
    })

    it('เงินเดือนเกิน 15,000 — ยังคง 750 บาท', () => {
      const result = calculateSso(new Decimal('50000.00'))
      expect(result.toString()).toBe('750.00')
    })

    it('เงินเดือน 10,000 บาท — SSO 500 บาท', () => {
      const result = calculateSso(new Decimal('10000.00'))
      expect(result.toString()).toBe('500.00')
    })
  })
})
