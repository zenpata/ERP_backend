import { test, expect, type Page, type Response } from '@playwright/test'

const EMAIL = process.env.E2E_EMAIL ?? 'admin@erp.com'
const PASSWORD = process.env.E2E_PASSWORD ?? 'password123'

const ROUTES_TO_CHECK = [
  '/dashboard',
  '/hr/employees',
  '/hr/employees/new',
  '/hr/organization',
  '/hr/payroll',
  '/hr/leaves',
  '/hr/attendance',
  '/finance/invoices',
  '/finance/invoices/new',
  '/finance/quotations',
  '/finance/quotations/new',
  '/finance/sales-orders',
  '/finance/sales-orders/new',
  '/finance/purchase-orders',
  '/finance/purchase-orders/new',
  '/finance/customers',
  '/finance/customers/new',
  '/finance/vendors',
  '/finance/vendors/new',
  '/finance/bank-accounts',
  '/finance/bank-accounts/new',
  '/finance/tax',
  '/finance/tax/vat-report',
  '/finance/tax/wht',
  '/finance/ap',
  '/finance/accounts',
  '/finance/journal-entries',
  '/finance/reports',
  '/pm/dashboard',
  '/pm/global-dashboard',
  '/pm/budgets',
  '/pm/budgets/new',
  '/pm/expenses',
  '/pm/expenses/new',
  '/pm/progress',
  '/pm/progress/new',
  '/notifications',
  '/settings/users',
  '/settings/roles',
  '/settings/system',
  '/account/change-password',
] as const

type HttpErrorItem = {
  method: string
  path: string
  status: number
  route: string
}

function toErrorLine(item: HttpErrorItem) {
  return `${item.route} :: ${item.method} ${item.path} -> ${item.status}`
}

function startApiErrorCollector(page: Page) {
  const errors: HttpErrorItem[] = []
  let currentRoute = '(before-navigation)'

  const onResponse = (response: Response) => {
    const status = response.status()
    if (status < 400 || status > 599) return
    const req = response.request()
    if (req.method() === 'OPTIONS') return
    try {
      const url = new URL(response.url())
      if (!url.pathname.startsWith('/api/')) return
      errors.push({
        method: req.method(),
        path: url.pathname,
        status,
        route: currentRoute,
      })
    } catch {
      // ignore malformed URL responses
    }
  }

  page.on('response', onResponse)

  return {
    errors,
    setRoute: (route: string) => {
      currentRoute = route
    },
    stop: () => {
      page.off('response', onResponse)
    },
  }
}

async function login(page: Page) {
  await page.goto('/login')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /เข้าสู่ระบบ|log in|login/i }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}

test.describe('R0 — all-pages HTTP smoke', () => {
  test('No API 4xx/5xx across all main routes', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000)
    const collector = startApiErrorCollector(page)
    try {
      await login(page)
      for (const route of ROUTES_TO_CHECK) {
        collector.setRoute(route)
        await page.goto(route)
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(700)
        await expect(page).not.toHaveURL(/\/login/)
      }
    } finally {
      collector.stop()
    }

    expect(
      collector.errors,
      `Unexpected API 4xx/5xx responses:\n${collector.errors.map(toErrorLine).join('\n')}`,
    ).toEqual([])
  })
})
