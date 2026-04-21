import { describe, expect, it } from 'bun:test'
import { userCanAccessDashboard } from '../../../src/modules/dashboard/dashboard-summary.service'

describe('userCanAccessDashboard', () => {
  it('returns false for empty permissions', () => {
    expect(userCanAccessDashboard([])).toBe(false)
  })

  it('allows finance invoice view', () => {
    expect(userCanAccessDashboard(['finance:invoice:view'])).toBe(true)
  })

  it('allows HR employee view', () => {
    expect(userCanAccessDashboard(['hr:employee:view'])).toBe(true)
  })

  it('allows PM budget view', () => {
    expect(userCanAccessDashboard(['pm:budget:view'])).toBe(true)
  })

  it('denies leave self-only without other dashboard perms', () => {
    expect(userCanAccessDashboard(['hr:leave:view_self'])).toBe(false)
  })

  it('allows when any one of finance/hr/ppm gates matches among many codes', () => {
    expect(
      userCanAccessDashboard(['hr:leave:view_self', 'finance:report:view', 'pm:expense:view'])
    ).toBe(true)
  })
})
