import { expect, type Page, type Route } from '@playwright/test'

const JSON_HDR = { 'content-type': 'application/json; charset=utf-8' }

export async function fulfillJson(route: Route, status: number, data: unknown) {
  await route.fulfill({
    status,
    headers: JSON_HDR,
    body: JSON.stringify(data),
  })
}

/**
 * Playwright route glob for API calls (Vite `VITE_API_URL` e.g. http://localhost:3000/api/...).
 * Prefer glob over RegExp so requests reliably match across hosts.
 */
export function apiUrlGlob(apiPath: string): string {
  const p = apiPath.startsWith('/') ? apiPath.slice(1) : apiPath
  return `**/api/${p}**`
}

export type AuthMePayload = {
  id: string
  email: string
  name?: string
  roles: string[]
  permissions?: string[]
  /** Login response /me — บังคับเปลี่ยนรหัส (SCN-01) */
  mustChangePassword?: boolean
}

export const MOCK_ADMIN_ME: AuthMePayload = {
  id: 'u-admin',
  email: 'admin@erp.com',
  name: 'Admin',
  roles: ['super_admin'],
  permissions: [],
}

export const MOCK_EMPLOYEE_ME: AuthMePayload = {
  id: 'u-emp',
  email: 'emp@erp.com',
  name: 'Employee User',
  roles: ['employee'],
  permissions: ['hr:leave:view_self'],
}

/** Non-elevated HR admin (explicit permissions only). */
export const MOCK_HR_ADMIN_ME: AuthMePayload = {
  id: 'u-hr-admin',
  email: 'hr@erp.com',
  name: 'HR Admin',
  roles: ['hr_admin'],
  permissions: [
    'hr:employee:view',
    'hr:employee:create',
    'hr:employee:edit',
    'hr:employee:delete',
  ],
}

export async function clearAuthStorage(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    try {
      localStorage.removeItem('erp-auth')
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  })
}

/** Standard success envelope for apiPost / apiFetch */
export function ok<T>(data: T) {
  return { success: true as const, data }
}

export async function installLoginSuccessRoutes(
  page: Page,
  me: AuthMePayload,
  opts?: { includeUserInLogin?: boolean },
) {
  const includeUser = opts?.includeUserInLogin !== false
  await page.route(apiUrlGlob('auth/login'), async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    const userPayload =
      includeUser && me.mustChangePassword !== undefined
        ? { ...me, mustChangePassword: me.mustChangePassword }
        : includeUser
          ? { ...me }
          : undefined
    await fulfillJson(
      route,
      200,
      ok({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        ...(includeUser && userPayload ? { user: userPayload } : {}),
      }),
    )
  })
}

export async function installLoginFailureRoute(page: Page, status = 401) {
  await page.route(apiUrlGlob('auth/login'), async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await fulfillJson(route, status, {
      success: false,
      message: 'Unauthorized',
      statusCode: status,
    })
  })
}

/** Success only when email+password match; otherwise 401 (wrong / unknown / inactive). */
export async function installConditionalLoginSuccess(page: Page, me: AuthMePayload, goodPassword: string) {
  await page.route(apiUrlGlob('auth/login'), async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    let body: { email?: string; password?: string } = {}
    try {
      body = route.request().postDataJSON() as { email?: string; password?: string }
    } catch {
      body = {}
    }
    if (body.email === me.email && body.password === goodPassword) {
      const userPayload =
        me.mustChangePassword !== undefined
          ? { ...me, mustChangePassword: me.mustChangePassword }
          : { ...me }
      await fulfillJson(
        route,
        200,
        ok({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: userPayload,
        }),
      )
      return
    }
    await fulfillJson(route, 401, {
      success: false,
      message: 'Unauthorized',
      statusCode: 401,
    })
  })
}

export async function installAuthMeRoute(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route(apiUrlGlob('auth/me'), handler)
}

export async function installAuthLogoutRoute(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route(apiUrlGlob('auth/logout'), handler)
}

export async function installAuthRefreshRoute(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route(apiUrlGlob('auth/refresh'), handler)
}

/** Minimal shape for `GET dashboard/summary` after login. */
export const MOCK_DASHBOARD_SUMMARY = {
  alerts: [] as { type: string; count: number; url: string }[],
  meta: {
    asOf: '2026-01-01T00:00:00.000Z',
    freshnessSeconds: 60,
    permissionTrimmedModules: [] as ('finance' | 'hr' | 'pm')[],
    widgetVisibilityMode: 'omit_widget' as const,
  },
}

export async function installDashboardSummaryMock(page: Page) {
  await page.route(apiUrlGlob('dashboard/summary'), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await fulfillJson(route, 200, ok(MOCK_DASHBOARD_SUMMARY))
  })
}

/** Default unread count (Header); override in tests that need 401 + refresh. */
export async function installNotificationUnreadMock(
  page: Page,
  handler?: (route: Route) => Promise<void>,
) {
  await page.route(apiUrlGlob('notifications/unread-count'), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    if (handler) await handler(route)
    else await fulfillJson(route, 200, ok({ count: 0 }))
  })
}

/** Login + dashboard + unread — enough to land on `/` after sign-in. */
export async function installStandardPostLoginMocks(page: Page, me: AuthMePayload) {
  await installLoginSuccessRoutes(page, me)
  await installDashboardSummaryMock(page)
  await installNotificationUnreadMock(page)
}

export async function submitLogin(page: Page, email: string, password: string) {
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /เข้าสู่ระบบ|log in|login/i }).click()
}

export async function openChangePasswordFromHeader(page: Page) {
  await page.getByRole('button', { name: /เมนูบัญชี|Account menu/i }).click()
  await page.getByRole('menuitem', { name: /เปลี่ยนรหัสผ่าน|change password/i }).click()
  await expect(page.getByTestId('change-password-panel')).toBeVisible()
}

/** Change password panel (modal or /account/change-password page): current → new → confirm. */
export function changePasswordInputs(page: Page) {
  return page.getByTestId('change-password-panel').locator('input[type="password"]')
}

const LOCK_MSG = 'บัญชีถูกล็อก กรุณาติดต่อ Admin เพื่อปลดล็อก'

/** Wrong password counts toward lock; 5th failure returns lock message; correct password while locked returns 403. */
export async function installLoginLockoutMock(
  page: Page,
  me: AuthMePayload,
  goodPassword: string,
) {
  let badAttempts = 0
  let locked = false

  await page.route(apiUrlGlob('auth/login'), async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    let body: { email?: string; password?: string } = {}
    try {
      body = route.request().postDataJSON() as { email?: string; password?: string }
    } catch {
      body = {}
    }
    if (body.email !== me.email) {
      await fulfillJson(route, 401, {
        success: false,
        message: 'Unauthorized',
        statusCode: 401,
      })
      return
    }
    if (body.password === goodPassword) {
      if (locked) {
        await fulfillJson(route, 403, {
          success: false,
          error: { code: 'FORBIDDEN', message: LOCK_MSG },
        })
        return
      }
      await fulfillJson(
        route,
        200,
        ok({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: { ...me },
        }),
      )
      return
    }
    badAttempts += 1
    if (badAttempts >= 5) {
      locked = true
      await fulfillJson(route, 403, {
        success: false,
        error: { code: 'FORBIDDEN', message: LOCK_MSG },
      })
      return
    }
    await fulfillJson(route, 401, {
      success: false,
      message: 'Unauthorized',
      statusCode: 401,
    })
  })
}
