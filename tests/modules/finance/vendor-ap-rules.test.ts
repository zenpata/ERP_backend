import { describe, expect, it } from 'bun:test'
import Decimal from 'decimal.js'

Decimal.set({ rounding: Decimal.ROUND_HALF_UP })

function roundMoney(n: number | string): number {
  return new Decimal(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
}

describe('finance AP money rounding (ROUND_HALF_UP)', () => {
  it('rounds 1.005 to 1.01', () => {
    expect(roundMoney(1.005)).toBe(1.01)
  })
  it('rounds 2.345 to 2.35', () => {
    expect(roundMoney(2.345)).toBe(2.35)
  })
  it('keeps 10.00', () => {
    expect(roundMoney(10)).toBe(10)
  })
})

describe('vendor code format', () => {
  const re = /^V-\d{4}$/
  it('accepts V-0001', () => {
    expect(re.test('V-0001')).toBe(true)
  })
  it('rejects v-0001 (normalized to uppercase in app)', () => {
    expect(re.test('v-0001')).toBe(false)
  })
})
