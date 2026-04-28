import { expect, type Page } from '@playwright/test'
import {
  clearAuthStorage,
  fulfillJson,
  installConditionalLoginSuccess,
  installDashboardSummaryMock,
  installNotificationUnreadMock,
  ok,
  submitLogin,
  type AuthMePayload,
} from './auth-api-mock'
import type { ScenarioActorSession } from './doc-models'

const DEFAULT_PASSWORD = process.env.E2E_PASSWORD ?? 'password123'

export const REAL_SCENARIO_ACTORS: Record<string, ScenarioActorSession> = {
  super_admin: {
    actor: 'super_admin',
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@erp.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? DEFAULT_PASSWORD,
    displayName: 'System Admin',
  },
  hr_admin: {
    actor: 'hr_admin',
    email: process.env.E2E_HR_EMAIL ?? 'hr@erp.com',
    password: process.env.E2E_HR_PASSWORD ?? DEFAULT_PASSWORD,
    displayName: 'HR Admin',
  },
  pm_manager: {
    actor: 'pm_manager',
    email: process.env.E2E_PM_EMAIL ?? 'pm@erp.com',
    password: process.env.E2E_PM_PASSWORD ?? DEFAULT_PASSWORD,
    displayName: 'PM Manager',
  },
  // Current seed has no dedicated finance user, so admin is the fallback actor for finance flows.
  finance_manager: {
    actor: 'finance_manager',
    email: process.env.E2E_FINANCE_EMAIL ?? process.env.E2E_ADMIN_EMAIL ?? 'admin@erp.com',
    password: process.env.E2E_FINANCE_PASSWORD ?? process.env.E2E_ADMIN_PASSWORD ?? DEFAULT_PASSWORD,
    displayName: 'Finance Manager (fallback)',
  },
  // Current seed has no employee login, so HR user is fallback for employee-only flows that need session.
  employee: {
    actor: 'employee',
    email: process.env.E2E_EMPLOYEE_EMAIL ?? process.env.E2E_HR_EMAIL ?? 'hr@erp.com',
    password: process.env.E2E_EMPLOYEE_PASSWORD ?? process.env.E2E_HR_PASSWORD ?? DEFAULT_PASSWORD,
    displayName: 'Employee (fallback)',
  },
}

export async function loginRealSession(page: Page, session: ScenarioActorSession) {
  await page.goto('/login')
  await submitLogin(page, session.email, session.password)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 25_000 })
}

async function dismissBlockingOverlay(page: Page) {
  const changePasswordPanel = page.getByTestId('change-password-panel')
  if (await changePasswordPanel.count()) {
    const cancel = page.getByRole('button', { name: /ยกเลิก|cancel/i }).first()
    if (await cancel.count()) {
      await cancel.click({ timeout: 3_000 }).catch(() => {})
    }
    await expect(changePasswordPanel).toHaveCount(0, { timeout: 5_000 }).catch(() => {})
  }

  // Generic fallback: try closing any top-level modal via escape before clicking sidebar actions.
  await page.keyboard.press('Escape').catch(() => {})
}

export async function logoutRealSession(page: Page) {
  await dismissBlockingOverlay(page)
  const logoutBtn = page.getByRole('button', { name: /ออกจากระบบ|logout/i })
  if (await logoutBtn.count()) {
    await logoutBtn.click({ force: true })
    const confirm = page.getByRole('button', { name: /ยืนยันออกจากระบบ|confirm sign out/i })
    if (await confirm.count()) {
      await confirm.click({ force: true })
    }
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    return
  }

  // Some pages hide sidebar; fallback to direct logout endpoint behavior via client route.
  await page.goto('/login')
}

export async function switchRealActor(page: Page, session: ScenarioActorSession) {
  await logoutRealSession(page)
  await loginRealSession(page, session)
}

export async function loginMockSession(page: Page, me: AuthMePayload, password = DEFAULT_PASSWORD) {
  await clearAuthStorage(page)
  await installConditionalLoginSuccess(page, me, password)
  await page.route('**/api/auth/me**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await fulfillJson(route, 200, ok(me))
  })
  await installDashboardSummaryMock(page)
  await installNotificationUnreadMock(page)
  await page.goto('/login')
  await submitLogin(page, me.email, password)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}
