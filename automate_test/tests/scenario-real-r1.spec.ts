import { expect, test } from '../fixtures/cdp-screencast'
import { annotateDocCase } from './helpers/doc-models'
import { loginRealSession, logoutRealSession, REAL_SCENARIO_ACTORS } from './helpers/session-helpers'

type ScenarioSpec = {
  id: string
  title: string
  path: string
}

const SCENARIOS: ScenarioSpec[] = [
  { id: 'SCN-01', title: 'Auth — Login / Logout / Change Password', path: '/dashboard' },
  { id: 'SCN-02', title: 'HR Employee Management', path: '/hr/employees' },
  { id: 'SCN-03', title: 'HR Organization', path: '/hr/organization' },
  { id: 'SCN-04', title: 'HR Leave Management', path: '/hr/leaves' },
  { id: 'SCN-05', title: 'HR Payroll', path: '/hr/payroll' },
  { id: 'SCN-06', title: 'Finance Invoice AR', path: '/finance/invoices' },
  { id: 'SCN-07', title: 'Finance Vendor Management', path: '/finance/vendors' },
  { id: 'SCN-08', title: 'Finance Accounts Payable', path: '/finance/ap' },
  { id: 'SCN-09', title: 'Finance Accounting Core', path: '/finance/accounts' },
  { id: 'SCN-10', title: 'Finance Reports', path: '/finance/reports' },
  { id: 'SCN-11', title: 'PM Budget Management', path: '/pm/budgets' },
  { id: 'SCN-12', title: 'PM Expense Management', path: '/pm/expenses' },
  { id: 'SCN-13', title: 'PM Progress & Tasks', path: '/pm/progress' },
  { id: 'SCN-14', title: 'PM Dashboard', path: '/pm/dashboard' },
  { id: 'SCN-15', title: 'Settings User Management', path: '/settings/users' },
  { id: 'SCN-16', title: 'Settings Role & Permission', path: '/settings/roles' },
]

function docPath(id: string) {
  const suffixById: Record<string, string> = {
    'SCN-01': 'SCN-01_Auth.md',
    'SCN-02': 'SCN-02_HR_Employee.md',
    'SCN-03': 'SCN-03_HR_Organization.md',
    'SCN-04': 'SCN-04_HR_Leave.md',
    'SCN-05': 'SCN-05_HR_Payroll.md',
    'SCN-06': 'SCN-06_Finance_Invoice_AR.md',
    'SCN-07': 'SCN-07_Finance_Vendor.md',
    'SCN-08': 'SCN-08_Finance_AP.md',
    'SCN-09': 'SCN-09_Finance_Accounting.md',
    'SCN-10': 'SCN-10_Finance_Reports.md',
    'SCN-11': 'SCN-11_PM_Budget.md',
    'SCN-12': 'SCN-12_PM_Expense.md',
    'SCN-13': 'SCN-13_PM_Tasks.md',
    'SCN-14': 'SCN-14_PM_Dashboard.md',
    'SCN-15': 'SCN-15_Settings_User.md',
    'SCN-16': 'SCN-16_Settings_Role.md',
  }
  return `Documents/scenarios/${suffixById[id]}`
}

async function assertPageLoaded(page: import('@playwright/test').Page, path: string) {
  await page.goto(path)
  await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')))
  await expect(page.getByText('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')).toHaveCount(0)
}

function actorForScenario(id: string) {
  if (id === 'SCN-01') return REAL_SCENARIO_ACTORS.super_admin
  if (['SCN-02', 'SCN-03', 'SCN-04', 'SCN-05'].includes(id)) return REAL_SCENARIO_ACTORS.hr_admin
  if (['SCN-11', 'SCN-12', 'SCN-13', 'SCN-14'].includes(id)) return REAL_SCENARIO_ACTORS.pm_manager
  if (['SCN-15', 'SCN-16'].includes(id)) return REAL_SCENARIO_ACTORS.super_admin
  return REAL_SCENARIO_ACTORS.finance_manager
}

test.describe('R1 Scenario Real E2E @scenario_real', () => {
  test.beforeEach(async ({ page, cdpScreencast }) => {
    await cdpScreencast.startCdpScreencast(page)
  })

  test.afterEach(async ({ page, cdpScreencast }) => {
    await cdpScreencast.stopCdpScreencast()
    await page.context().clearCookies()
  })

  for (const scn of SCENARIOS) {
    test(`${scn.id} ${scn.title}`, { tag: '@scenario_real' }, async ({ page }) => {
      annotateDocCase(test.info(), {
        kind: 'scenario',
        id: scn.id,
        title: scn.title,
        documentPath: docPath(scn.id),
      })

      // Actor mapping follows scenario domain ownership.
      const actor = actorForScenario(scn.id)

      if (['SCN-06', 'SCN-07', 'SCN-08', 'SCN-09', 'SCN-10'].includes(scn.id)) {
        test.info().annotations.push({
          type: 'actor-note',
          description: 'Finance scenario uses finance_manager fallback from seeded admin account when dedicated finance user is absent.',
        })
      }

      await loginRealSession(page, actor)

      if (scn.id === 'SCN-01') {
        await assertPageLoaded(page, '/dashboard')
        await page.getByRole('button', { name: /เมนูบัญชี|account menu/i }).click()
        await page.getByRole('menuitem', { name: /เปลี่ยนรหัสผ่าน|change password/i }).click()
        const panel = page.getByTestId('change-password-panel')
        await expect(panel).toBeVisible()
        await page.getByRole('button', { name: /ยกเลิก|cancel/i }).first().click()
        await expect(panel).toHaveCount(0)
      } else if (scn.id === 'SCN-04') {
        await assertPageLoaded(page, scn.path)
        await page.locator('select').first().selectOption({ index: 1 })
        await page.locator('input[type="date"]').first().fill('2026-04-28')
        await page.locator('input[type="date"]').nth(1).fill('2026-04-28')
        await page.getByRole('button', { name: /ส่งคำขอ|submit|บันทึก/i }).first().click()
      } else if (scn.id === 'SCN-09') {
        await assertPageLoaded(page, '/finance/accounts')
        await assertPageLoaded(page, '/finance/journal-entries')
      } else {
        await assertPageLoaded(page, scn.path)
      }

      await logoutRealSession(page)
    })
  }
})
