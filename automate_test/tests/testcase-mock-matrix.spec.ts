import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { expect, test, type CdpScreencastFixture } from '../fixtures/cdp-screencast'
import { type AuthMePayload, apiUrlGlob } from './helpers/auth-api-mock'
import { annotateDocCase, annotateSpecGap, type DocCaseRef } from './helpers/doc-models'
import { installAllModuleMockRouters } from './helpers/mock-routers'
import { createRealisticMockState, type MockErpState } from './helpers/realistic-data'
import { loginMockSession } from './helpers/session-helpers'
import { loadTestcaseDocs } from './helpers/testcase-doc'

const PROJECT_ROOT = path.resolve(process.cwd(), '..')

const DOCS = loadTestcaseDocs(PROJECT_ROOT).filter(
  (doc) => !['R1-01', 'R1-02', 'R1-03'].includes(doc.code),
)

const SUPER_ADMIN: AuthMePayload = {
  id: 'mock-super-admin',
  email: 'mock.super.admin@erp.local',
  name: 'Mock Super Admin',
  roles: ['super_admin'],
  permissions: [],
}

const NON_FINANCE_USER: AuthMePayload = {
  id: 'mock-non-finance',
  email: 'mock.non.finance@erp.local',
  name: 'Mock Employee',
  roles: ['employee'],
  permissions: ['hr:leave:view_self'],
}

const NON_ADMIN_USER: AuthMePayload = {
  id: 'mock-non-admin',
  email: 'mock.non.admin@erp.local',
  name: 'Mock PM User',
  roles: ['pm_manager'],
  permissions: ['pm:dashboard:view'],
}

type CaseHandler = (params: {
  page: Page
  state: MockErpState
  testInfo: TestInfo
}) => Promise<void>

const feasibleHandlers = new Map<string, CaseHandler>()

function addFeasible(code: string, title: string, handler: CaseHandler) {
  feasibleHandlers.set(`${code}::${title}`, handler)
}

function waitApi(page: Page, method: string, pathMatcher: RegExp | string) {
  return page.waitForResponse((res) => {
    if (res.request().method() !== method) return false
    try {
      const pathname = new URL(res.url()).pathname
      if (typeof pathMatcher === 'string') return pathname.includes(pathMatcher)
      return pathMatcher.test(pathname)
    } catch {
      return false
    }
  })
}

async function expectAccessDenied(page: Page) {
  await expect(
    page.getByText(/คุณไม่มีสิทธิ์เข้าถึงหน้านี้|no permission|ไม่มีสิทธิ์/i),
  ).toBeVisible({ timeout: 15_000 })
}

async function runMockCase(
  page: Page,
  cdpScreencast: CdpScreencastFixture,
  me: AuthMePayload,
  testInfo: TestInfo,
  scenario: (ctx: { page: Page; state: MockErpState; testInfo: TestInfo }) => Promise<void>,
) {
  const state = createRealisticMockState()
  await cdpScreencast.startCdpScreencast(page)
  try {
    await installAllModuleMockRouters(page, state)
    await loginMockSession(page, me)
    await scenario({ page, state, testInfo })
  } finally {
    await cdpScreencast.stopCdpScreencast()
    await page
      .context()
      .unrouteAll({ behavior: 'ignoreErrors' })
      .catch(() => {})
  }
}

function refFromDoc(doc: { code: string; absolutePath: string }, title: string): DocCaseRef {
  return {
    kind: 'testcase',
    id: doc.code,
    title,
    documentPath: path.relative(PROJECT_ROOT, doc.absolutePath),
  }
}

addFeasible('R1-04', 'Load leave types before creating request', async ({ page }) => {
  const leaveTypeRes = waitApi(page, 'GET', /\/api\/hr\/leaves\/types$/)
  await page.goto('/hr/leaves')
  expect((await leaveTypeRes).status()).toBe(200)
  await expect(page.locator('form select option')).toHaveCount(4)
})

addFeasible('R1-04', 'Create leave request successfully', async ({ page }) => {
  await page.goto('/hr/leaves')
  await page.locator('form select').first().selectOption('lt-annual')
  const dateInputs = page.locator('form input[type="date"]')
  await dateInputs.first().fill('2026-04-28')
  await dateInputs.nth(1).fill('2026-04-28')

  const createRes = waitApi(page, 'POST', /\/api\/hr\/leaves$/)
  await page.getByRole('button', { name: /ส่งคำขอ/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page.getByText('EMP-0001')).toBeVisible()
})

addFeasible('R1-04', 'Create leave request fails with missing required fields', async ({ page }) => {
  await page.goto('/hr/leaves')
  let leaveCreatePosted = false
  page.on('request', (req) => {
    if (req.method() === 'POST') {
      try {
        const pathname = new URL(req.url()).pathname
        if (pathname.endsWith('/api/hr/leaves')) leaveCreatePosted = true
      } catch {
        // ignore malformed URL in request inspection
      }
    }
  })
  await page.getByRole('button', { name: /ส่งคำขอ/i }).click()
  await page.waitForTimeout(300)
  expect(leaveCreatePosted).toBe(false)
})

addFeasible('R1-04', 'Approve leave request', async ({ page }) => {
  await page.goto('/hr/leaves')
  const approveRes = waitApi(page, 'PATCH', /\/api\/hr\/leaves\/[^/]+\/approve$/)
  await page.getByRole('button', { name: /อนุมัติ/i }).first().click()
  expect((await approveRes).status()).toBe(200)
  await expect(page.getByText(/อนุมัติแล้ว/i)).toBeVisible()
})

addFeasible('R1-05', 'View payroll run list', async ({ page }) => {
  await page.goto('/hr/payroll')
  await expect(page.getByText(/4\/2026/)).toBeVisible()
})

addFeasible('R1-05', 'Create new payroll run', async ({ page }) => {
  await page.goto('/hr/payroll')
  const monthInput = page.locator('input[type="number"]').first()
  const yearInput = page.locator('input[type="number"]').nth(1)
  await monthInput.fill('5')
  await yearInput.fill('2026')

  const createRes = waitApi(page, 'POST', /\/api\/hr\/payroll\/runs$/)
  await page.getByRole('button', { name: /สร้างงวด/i }).click()
  const response = await createRes
  expect(response.status()).toBe(201)
  const payload = (await response.json()) as { data?: { id?: string } }
  expect(payload.data?.id).toBe('run-2026-05')
})

addFeasible('R1-05', 'Process payroll run', async ({ page }) => {
  await page.goto('/hr/payroll')
  await page.locator('input[type="number"]').first().fill('5')
  await page.locator('input[type="number"]').nth(1).fill('2026')
  const createRes = waitApi(page, 'POST', /\/api\/hr\/payroll\/runs$/)
  await page.getByRole('button', { name: /สร้างงวด/i }).click()
  expect((await createRes).status()).toBe(201)

  const processRes = waitApi(page, 'POST', /\/api\/hr\/payroll\/runs\/[^/]+\/process$/)
  await page.getByRole('button', { name: /ประมวลผล/i }).first().click()
  expect((await processRes).status()).toBe(200)
})

addFeasible('R1-05', 'Approve payroll run', async ({ page }) => {
  await page.goto('/hr/payroll')
  const approveRes = waitApi(page, 'POST', /\/api\/hr\/payroll\/runs\/[^/]+\/approve$/)
  await page.getByRole('button', { name: /อนุมัติ/i }).first().click()
  expect((await approveRes).status()).toBe(200)
})

addFeasible('R1-05', 'Mark payroll run as paid', async ({ page }) => {
  await page.goto('/hr/payroll')
  const approveRes = waitApi(page, 'POST', /\/api\/hr\/payroll\/runs\/[^/]+\/approve$/)
  await page.getByRole('button', { name: /อนุมัติ/i }).first().click()
  expect((await approveRes).status()).toBe(200)

  const markPaidRes = waitApi(page, 'POST', /\/api\/hr\/payroll\/runs\/[^/]+\/mark-paid$/)
  await page.getByRole('button', { name: /บันทึกจ่ายแล้ว/i }).first().click()
  expect((await markPaidRes).status()).toBe(200)
})

addFeasible('R1-06', 'View invoice list', async ({ page }) => {
  await page.goto('/finance/invoices')
  await expect(page.getByText('INV-2026-0001')).toBeVisible()
})

addFeasible('R1-06', 'Create invoice successfully', async ({ page, state }) => {
  await page.goto('/finance/invoices/new')
  await page.locator('#invoice-customer').selectOption(state.customers[0].id)
  await page.locator('#invoice-due-date').fill('2026-05-15')
  await page.getByPlaceholder('Description').fill('ค่าบริการเสริมรายเดือน')
  await page.getByPlaceholder('Unit Price').fill('25000')

  const createRes = waitApi(page, 'POST', /\/api\/finance\/invoices$/)
  await page.getByRole('button', { name: /^Save$/ }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/finance\/invoices\//)
})

addFeasible('R1-06', 'View invoice detail', async ({ page, state }) => {
  await page.goto(`/finance/invoices/${state.invoices[0].id}`)
  await expect(page.getByRole('heading', { name: state.invoices[0].invoiceNumber })).toBeVisible()
  await expect(page.getByText(/ERP Implementation/)).toBeVisible()
})

addFeasible('R1-06', 'Change invoice status', async ({ page, state }) => {
  await page.goto(`/finance/invoices/${state.invoices[0].id}`)
  page.once('dialog', async (dialog) => {
    await dialog.accept()
  })
  const patchRes = waitApi(page, 'PATCH', /\/api\/finance\/invoices\/[^/]+\/status$/)
  await page.getByRole('button', { name: /ยกเลิกใบแจ้งหนี้/i }).click()
  expect((await patchRes).status()).toBe(200)
  await expect(page.getByText(/Cancelled|ยกเลิก/i)).toBeVisible()
})

addFeasible('R1-06', 'Record customer payment on invoice', async ({ page, state }) => {
  await page.goto(`/finance/invoices/${state.invoices[0].id}`)
  const paymentForm = page.locator('form').filter({ hasText: /บันทึกการชำระเงิน/i })
  await paymentForm.locator('input[type="number"]').first().fill('10000')
  await paymentForm.locator('input[type="date"]').first().fill('2026-04-25')
  await paymentForm.locator('input').nth(2).fill('RCPT-001')

  const payRes = waitApi(page, 'POST', /\/api\/finance\/invoices\/[^/]+\/payments$/)
  await page.getByRole('button', { name: /บันทึกการชำระ/i }).click()
  expect((await payRes).status()).toBe(200)
  await expect(page.getByText(/ประวัติการชำระ/i)).toBeVisible()
})

addFeasible('R1-06', 'Export invoice to PDF', async ({ page, state }) => {
  await page.goto(`/finance/invoices/${state.invoices[0].id}`)
  const pdfRes = waitApi(page, 'GET', /\/api\/finance\/invoices\/[^/]+\/pdf$/)
  await page.getByRole('button', { name: /ดาวน์โหลด PDF/i }).click()
  expect((await pdfRes).status()).toBe(200)
})

addFeasible('R1-06', 'Access denied for non-finance user', async ({ page }) => {
  await page.goto('/finance/invoices')
  await expectAccessDenied(page)
})

addFeasible('R1-07', 'View vendor list', async ({ page }) => {
  await page.goto('/finance/vendors')
  await expect(page.getByText('VEND-0001')).toBeVisible()
})

addFeasible('R1-07', 'Create vendor with required fields', async ({ page }) => {
  await page.goto('/finance/vendors/new')
  await page.locator('input').first().fill('VEND-0099')
  await page.locator('input[required]').fill('บริษัท ซัพพลายเพิ่ม จำกัด')
  const createRes = waitApi(page, 'POST', /\/api\/finance\/vendors$/)
  await page.getByRole('button', { name: /^Save$/ }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/finance\/vendors$/)
})

addFeasible('R1-07', 'Create vendor fails with duplicate code', async ({ page, state }) => {
  await page.goto('/finance/vendors/new')
  await page.locator('input').first().fill(state.vendors[0].code)
  await page.locator('input[required]').fill('ผู้ขายซ้ำรหัส')
  await page.getByRole('button', { name: /^Save$/ }).click()
  await expect(page.getByText(/duplicate code/i)).toBeVisible()
})

addFeasible('R1-08', 'View AP bill list', async ({ page }) => {
  await page.goto('/finance/ap')
  await expect(page.getByText('AP-2026-0001')).toBeVisible()
})

addFeasible('R1-08', 'Create AP bill with vendor and items', async ({ page }) => {
  await page.goto('/finance/ap')
  await page.getByPlaceholder(/Search vendor/i).fill('VEND-0001')
  await page.getByRole('button', { name: /VEND-0001/i }).first().click()

  const dateInputs = page.locator('section').first().locator('input[type="date"]')
  await dateInputs.nth(0).fill('2026-04-24')
  await dateInputs.nth(1).fill('2026-05-24')
  await dateInputs.nth(2).fill('2026-04-24')

  const lineRow = page.locator('tbody tr').first()
  await lineRow.locator('input').nth(0).fill('ค่าบริการรายเดือน')
  await lineRow.locator('input[type="number"]').nth(0).fill('1')
  await lineRow.locator('input[type="number"]').nth(1).fill('15000')

  const createRes = waitApi(page, 'POST', /\/api\/finance\/ap\/vendor-invoices$/)
  await page.getByRole('button', { name: /Create invoice/i }).click()
  expect((await createRes).status()).toBe(201)
})

addFeasible('R1-08', 'Approve AP bill', async ({ page }) => {
  await page.goto('/finance/ap')
  const approveRes = waitApi(page, 'PATCH', /\/api\/finance\/ap\/vendor-invoices\/[^/]+\/status$/)
  await page.getByRole('button', { name: /^Approve$/ }).first().click()
  expect((await approveRes).status()).toBe(200)
})

addFeasible('R1-08', 'Record partial payment on AP bill', async ({ page }) => {
  await page.goto('/finance/ap')
  const approveRes = waitApi(page, 'PATCH', /\/api\/finance\/ap\/vendor-invoices\/[^/]+\/status$/)
  await page.getByRole('button', { name: /^Approve$/ }).first().click()
  expect((await approveRes).status()).toBe(200)

  const row = page.locator('tbody tr').filter({ hasText: /AP-2026-0001/i }).first()
  await expect(row.getByRole('button', { name: /^Record payment$/ })).toBeVisible()
  const payRes = waitApi(page, 'POST', /\/api\/finance\/ap\/vendor-invoices\/[^/]+\/payments$/)
  await row.locator('input[type="date"]').first().fill('2026-04-25')
  await row.locator('input[type="number"]').first().fill('1000')
  await row.getByRole('button', { name: /^Record payment$/ }).click()
  expect((await payRes).status()).toBe(200)
})

addFeasible('R1-08', 'Payment amount exceeds remaining fails', async ({ page }) => {
  await page.goto('/finance/ap')
  const approveRes = waitApi(page, 'PATCH', /\/api\/finance\/ap\/vendor-invoices\/[^/]+\/status$/)
  await page.getByRole('button', { name: /^Approve$/ }).first().click()
  expect((await approveRes).status()).toBe(200)

  const row = page.locator('tbody tr').filter({ hasText: /AP-2026-0001/i }).first()
  await expect(row.getByRole('button', { name: /^Record payment$/ })).toBeVisible()
  const payRes = waitApi(page, 'POST', /\/api\/finance\/ap\/vendor-invoices\/[^/]+\/payments$/)
  await row.locator('input[type="date"]').first().fill('2026-04-25')
  await row.locator('input[type="number"]').first().fill('999999')
  await row.getByRole('button', { name: /^Record payment$/ }).click()
  expect((await payRes).status()).toBe(422)
  await expect(page.getByText(/amount exceeds remaining/i)).toBeVisible()
})

addFeasible('R1-09', 'View chart of accounts list', async ({ page }) => {
  await page.goto('/finance/accounts')
  await expect(page.getByText(/Cash/)).toBeVisible()
})

addFeasible('R1-09', 'View journal list', async ({ page }) => {
  await page.goto('/finance/journal-entries')
  await expect(page.getByText('JE-2026-0001')).toBeVisible()
})

addFeasible('R1-10', 'Load finance reports summary page', async ({ page }) => {
  await page.goto('/finance/reports')
  await expect(page.getByText(/Total Revenue/i)).toBeVisible()
  await expect(page.getByText(/Total AP/i)).toBeVisible()
})

addFeasible('R1-10', 'Load AR Aging report tab', async ({ page }) => {
  await page.goto('/finance/reports')
  await page.getByRole('button', { name: /AR aging/i }).click()
  await expect(page.getByText('CUST-TH-001')).toBeVisible()
})

addFeasible('R1-11', 'View budget list', async ({ page }) => {
  await page.goto('/pm/budgets')
  await expect(page.getByText('BUD-2026-001')).toBeVisible()
})

addFeasible('R1-11', 'Create new budget with required fields', async ({ page }) => {
  await page.goto('/pm/budgets/new')
  await page.locator('#budget-type').fill('OPEX')
  await page.locator('#budget-project').fill('โครงการทดสอบ Automation')
  await page.locator('#budget-total').fill('150000')
  await page.locator('#budget-owner').fill('คุณทดสอบ')
  await page.locator('#budget-start-date').fill('2026-05-01')
  await page.locator('#budget-end-date').fill('2026-12-31')

  const createRes = waitApi(page, 'POST', /\/api\/pm\/budgets$/)
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/pm\/budgets\//)
})

addFeasible('R1-11', 'Create budget fails with missing amount', async ({ page }) => {
  await page.goto('/pm/budgets/new')
  await page.locator('#budget-type').fill('OPEX')
  await page.locator('#budget-project').fill('โครงการงบไม่ครบ')
  await page.locator('#budget-owner').fill('ผู้ทดสอบ')
  await page.locator('#budget-start-date').fill('2026-05-01')
  await page.locator('#budget-end-date').fill('2026-12-31')
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  await expect(page.getByText(/รูปแบบจำนวนเงินไม่ถูกต้อง/i)).toBeVisible()
})

addFeasible('R1-12', 'View expense list', async ({ page }) => {
  await page.goto('/pm/expenses')
  await expect(page.getByText('ค่าเดินทางทีมติดตั้ง')).toBeVisible()
})

addFeasible('R1-12', 'Load active budgets for expense form', async ({ page, state }) => {
  await page.goto('/pm/expenses/new')
  const budgetSelect = page.locator('select').first()
  await expect
    .poll(async () => budgetSelect.locator('option').count())
    .toBeGreaterThan(1)
  await expect(budgetSelect.locator('option', { hasText: state.budgets[0].budgetCode })).toHaveCount(1)
})

addFeasible('R1-12', 'Create expense linked to budget', async ({ page, state }) => {
  await page.goto('/pm/expenses/new')
  await page.locator('input[name="title"]').fill('ค่าใช้งานระบบทดสอบ')
  const budgetSelect = page.locator('select[name="budgetId"]')
  await expect.poll(async () => budgetSelect.locator('option').count()).toBeGreaterThan(1)
  await budgetSelect.selectOption(state.budgets[0].id)
  await page.locator('input[name="amount"]').fill('10000')
  await page.locator('input[name="expenseDate"]').fill('2026-05-20')
  await page.locator('input[name="category"]').fill('Software')
  await page.locator('input[name="requestedByName"]').fill('ทีม QA')

  const createRes = waitApi(page, 'POST', /\/api\/pm\/expenses$/)
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/pm\/expenses$/)
})

addFeasible('R1-12', 'Create expense fails with missing required fields', async ({ page }) => {
  await page.goto('/pm/expenses/new')
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  await expect(page.getByText(/กรุณาระบุชื่อรายการ/i)).toBeVisible()
})

addFeasible('R1-13', 'View task list with KPI summary', async ({ page }) => {
  await page.goto('/pm/progress')
  await expect(page.getByText('เตรียม UAT Script')).toBeVisible()
  await expect(page.getByText(/ความคืบหน้าตามโมดูล/i)).toBeVisible()
})

addFeasible('R1-13', 'Create task with required fields', async ({ page }) => {
  await page.goto('/pm/progress/new')
  await page.locator('input').first().fill('เตรียมเอกสาร SIT')
  await page.locator('input').nth(1).fill('PM')
  await page.locator('input').nth(2).fill('Testing')
  await page.locator('input[type="number"]').fill('20')
  await page.locator('input[type="date"]').nth(0).fill('2026-05-01')
  await page.locator('input[type="date"]').nth(1).fill('2026-05-30')
  await page.locator('input').last().fill('ทีม PM')

  const createRes = waitApi(page, 'POST', /\/api\/pm\/progress$/)
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/pm\/progress$/)
})

addFeasible('R1-13', 'Create task fails with missing title', async ({ page }) => {
  await page.goto('/pm/progress/new')
  let taskCreated = false
  page.on('request', (req) => {
    if (req.method() === 'POST') {
      try {
        if (new URL(req.url()).pathname.endsWith('/api/pm/progress')) {
          taskCreated = true
        }
      } catch {
        // ignore malformed URL in request inspection
      }
    }
  })
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  await page.waitForTimeout(300)
  expect(taskCreated).toBe(false)
})

addFeasible('R1-14', 'Load PM dashboard successfully', async ({ page }) => {
  await page.goto('/pm/dashboard')
  await expect(page.getByText(/งบรวม/)).toBeVisible()
  await expect(page.getByText(/งานล่าสุด/)).toBeVisible()
})

addFeasible('R1-14', 'Drill down from budget overview to budgets page', async ({ page }) => {
  await page.goto('/pm/dashboard')
  const budgetOverview = page.locator('section').filter({ hasText: /ภาพรวม Budget/i }).first()
  await budgetOverview.getByRole('link', { name: /ดูทั้งหมด/i }).click()
  await expect(page).toHaveURL(/\/pm\/budgets$/)
})

addFeasible('R1-15', 'View user list', async ({ page }) => {
  await page.goto('/settings/users')
  await expect(page.getByText('admin@erp.com')).toBeVisible()
})

addFeasible('R1-15', 'Assign roles to user', async ({ page }) => {
  await page.goto('/settings/users')
  const rolePatch = waitApi(page, 'PATCH', /\/api\/settings\/users\/[^/]+\/roles$/)
  await page.locator('tbody tr').nth(1).locator('select').selectOption('role-pm-manager')
  expect((await rolePatch).status()).toBe(200)
})

addFeasible('R1-15', 'Deactivate user', async ({ page }) => {
  await page.goto('/settings/users')
  const rows = page.locator('tbody tr')
  const rowCount = await rows.count()
  let row = rows.first()
  for (let index = 0; index < rowCount; index += 1) {
    const candidate = rows.nth(index)
    const toggle = candidate.locator('input[type="checkbox"]')
    if ((await toggle.count()) > 0 && (await toggle.isChecked())) {
      row = candidate
      break
    }
  }
  const activeToggle = row.locator('input[type="checkbox"]').first()
  const activePatch = waitApi(page, 'PATCH', /\/api\/settings\/users\/[^/]+\/activate$/)
  await activeToggle.click()
  expect((await activePatch).status()).toBe(200)
  await expect(activeToggle).not.toBeChecked()
  await expect(row.getByText(/ปิดใช้งาน|inactive/i)).toBeVisible()
})

addFeasible('R1-16', 'View roles list', async ({ page }) => {
  await page.goto('/settings/roles')
  await expect(page.getByText('super_admin')).toBeVisible()
  await expect(page.getByText('hr_admin')).toBeVisible()
})

addFeasible('R1-16', 'Save permission matrix for role', async ({ page }) => {
  await page.goto('/settings/roles')
  const editableCheckbox = page.locator('input[type="checkbox"]:not([disabled])').first()
  const saveRes = waitApi(page, 'PUT', /\/api\/settings\/roles\/[^/]+\/permissions$/)
  await editableCheckbox.click({ force: true })
  expect((await saveRes).status()).toBe(200)
})

addFeasible('R2-01', 'View customer list', async ({ page }) => {
  await page.goto('/finance/customers')
  await expect(page.getByText('CUST-TH-001')).toBeVisible()
})

addFeasible('R2-01', 'Create customer with required fields', async ({ page }) => {
  await page.goto('/finance/customers/new')
  await page.locator('input').first().fill('CUST-NEW-001')
  await page.locator('input[required]').fill('บริษัท ลูกค้าใหม่ จำกัด')
  const createRes = waitApi(page, 'POST', /\/api\/finance\/customers$/)
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/finance\/customers$/)
})

addFeasible('R2-01', 'Create customer fails with duplicate code', async ({ page, state }) => {
  await page.goto('/finance/customers/new')
  await page.locator('input').first().fill(state.customers[0].code)
  await page.locator('input[required]').fill('ลูกค้ารหัสซ้ำ')
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  await expect(page.getByText(/duplicate code/i)).toBeVisible()
})

addFeasible('R2-02', 'View invoice detail before recording payment', async ({ page, state }) => {
  await page.goto(`/finance/invoices/${state.invoices[0].id}`)
  await expect(page.getByText(/คงค้าง/)).toBeVisible()
})

addFeasible('R2-02', 'Record partial payment', async ({ page, state }) => {
  await page.goto(`/finance/invoices/${state.invoices[0].id}`)
  const payRes = waitApi(page, 'POST', /\/api\/finance\/invoices\/[^/]+\/payments$/)
  await page.locator('form').filter({ hasText: /บันทึกการชำระเงิน/i }).locator('input[type="number"]').first().fill('5000')
  await page.getByRole('button', { name: /บันทึกการชำระ/i }).click()
  expect((await payRes).status()).toBe(200)
})

addFeasible('R2-02', 'Payment amount exceeds balance', async ({ page, state }) => {
  await page.goto(`/finance/invoices/${state.invoices[0].id}`)
  const payRes = waitApi(page, 'POST', /\/api\/finance\/invoices\/[^/]+\/payments$/)
  await page.locator('form').filter({ hasText: /บันทึกการชำระเงิน/i }).locator('input[type="number"]').first().fill('999999')
  await page.getByRole('button', { name: /บันทึกการชำระ/i }).click()
  expect((await payRes).status()).toBe(422)
  await expect(page.getByText(/amount exceeds balance/i)).toBeVisible()
})

addFeasible('R2-03', 'View tax rates list', async ({ page }) => {
  await page.goto('/finance/tax')
  await expect(page.getByText('VAT7')).toBeVisible()
})

addFeasible('R2-03', 'Create new tax rate', async ({ page }) => {
  await page.goto('/finance/tax')
  await page.getByRole('button', { name: /เพิ่มอัตราภาษี/i }).click()
  const form = page.locator('div').filter({ hasText: /บันทึกอัตรา/i }).first()
  await form.locator('input').nth(0).fill('WHT3-AUTO')
  await form.locator('input').nth(1).fill('3')
  await form.locator('input').nth(2).fill('WHT 3% for testing')

  const createRes = waitApi(page, 'POST', /\/api\/finance\/tax\/rates$/)
  await page.getByRole('button', { name: /บันทึกอัตรา/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page.getByText('WHT3-AUTO')).toBeVisible()
})

addFeasible('R2-04', 'View Profit and Loss report', async ({ page }) => {
  await page.goto('/finance/reports')
  await page.getByRole('button', { name: /กำไรขาดทุน/i }).click()
  await page.getByRole('button', { name: /ดูรายงาน/i }).click()
  await expect(page.getByText(/Service Revenue/i)).toBeVisible()
})

addFeasible('R2-05', 'View bank accounts list', async ({ page }) => {
  await page.goto('/finance/bank-accounts')
  await expect(page.getByText('KTB-001')).toBeVisible()
})

addFeasible('R2-05', 'Create bank account', async ({ page }) => {
  await page.goto('/finance/bank-accounts/new')
  await page.locator('input[required]').nth(0).fill('บัญชีสำรองโครงการ')
  await page.locator('input[required]').nth(1).fill('777-1-23456-7')
  await page.locator('input[required]').nth(2).fill('KBank')
  await page.locator('input').nth(3).fill('บางรัก')
  await page.locator('input[type="number"]').fill('50000')

  const createRes = waitApi(page, 'POST', /\/api\/finance\/bank-accounts$/)
  await page.getByRole('button', { name: /บันทึก/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/finance\/bank-accounts\//)
})

addFeasible('R2-05', 'View bank account detail with transaction history', async ({ page }) => {
  await page.goto('/finance/bank-accounts/bank-001')
  await expect(page.getByText(/เงินรับจากลูกค้า/i)).toBeVisible()
})

addFeasible('R2-05', 'Add manual deposit transaction', async ({ page }) => {
  await page.goto('/finance/bank-accounts/bank-001')
  await page.locator('form select').selectOption('deposit')
  await page.getByPlaceholder(/รายละเอียด/i).fill('รับเงินโครงการใหม่')
  await page.getByPlaceholder(/จำนวนเงิน/i).fill('12000')
  const txRes = waitApi(page, 'POST', /\/api\/finance\/bank-accounts\/[^/]+\/transactions$/)
  await page.getByRole('button', { name: /^เพิ่ม$/ }).click()
  expect((await txRes).status()).toBe(201)
  await expect(page.getByText(/รับเงินโครงการใหม่/i)).toBeVisible()
})

addFeasible('R2-06', 'View purchase order list', async ({ page }) => {
  await page.goto('/finance/purchase-orders')
  await expect(page.getByText('PO-2026-0001')).toBeVisible()
})

addFeasible('R2-07', 'View work schedules list', async ({ page }) => {
  await page.goto('/hr/attendance')
  await expect(page.getByText(/Office hours/)).toBeVisible()
})

addFeasible('R2-07', 'Record employee check-in', async ({ page }) => {
  await page.goto('/hr/attendance')
  const inRes = waitApi(page, 'POST', /\/api\/hr\/attendance\/check-in$/)
  await page.getByRole('button', { name: /ลงเวลาเข้า/i }).click()
  expect((await inRes).status()).toBe(201)
})

addFeasible('R2-07', 'Record employee check-out', async ({ page }) => {
  await page.goto('/hr/attendance')
  const inRes = waitApi(page, 'POST', /\/api\/hr\/attendance\/check-in$/)
  await page.getByRole('button', { name: /ลงเวลาเข้า/i }).click()
  expect((await inRes).status()).toBe(201)
  const outRes = waitApi(page, 'PATCH', /\/api\/hr\/attendance\/[^/]+\/check-out$/)
  await page.getByRole('button', { name: /ลงเวลาออก/i }).click()
  expect((await outRes).status()).toBe(200)
})

addFeasible('R2-07', 'Create OT request', async ({ page }) => {
  await page.goto('/hr/attendance')
  await page.getByPlaceholder(/เหตุผล/i).fill('ปิดงาน production')
  const otRes = waitApi(page, 'POST', /\/api\/hr\/overtime$/)
  await page.getByRole('button', { name: /ส่งคำขอ OT/i }).click()
  expect((await otRes).status()).toBe(201)
})

addFeasible('R2-07', 'Manage holidays', async ({ page }) => {
  await page.goto('/hr/attendance')
  await page.getByPlaceholder(/ชื่อวันหยุด/i).fill('วันหยุดทดสอบระบบ')
  const createRes = waitApi(page, 'POST', /\/api\/hr\/holidays$/)
  await page.getByRole('button', { name: /เพิ่มวันหยุด/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page.getByText(/วันหยุดทดสอบระบบ/i)).toBeVisible()
})

addFeasible('R2-07', 'Delete holiday', async ({ page }) => {
  await page.goto('/hr/attendance')
  const deleteRes = waitApi(page, 'DELETE', /\/api\/hr\/holidays\/[^/]+$/)
  await page.getByRole('button', { name: /^ลบ$/ }).first().click()
  expect((await deleteRes).status()).toBe(200)
})

addFeasible('R2-08', 'Load company settings', async ({ page }) => {
  await page.goto('/settings/system')
  await expect(page.locator('label:has-text("ชื่อบริษัท (ไทย)") input')).toHaveValue(
    'บริษัท เอ็นเตอร์ไพรซ์ ไทย จำกัด',
  )
})

addFeasible('R2-08', 'Edit company information', async ({ page }) => {
  await page.goto('/settings/system')
  const phoneInput = page.locator('label:has-text("โทรศัพท์") input')
  await phoneInput.fill('02-999-8888')
  const saveRes = waitApi(page, 'PUT', /\/api\/settings\/company$/)
  await page.getByRole('button', { name: /บันทึกบริษัท/i }).click()
  expect((await saveRes).status()).toBe(200)
})

addFeasible('R2-08', 'Generate fiscal periods for year', async ({ page }) => {
  await page.goto('/settings/system')
  await page.locator('input[type="number"]').first().fill('2027')
  const genRes = waitApi(page, 'POST', /\/api\/settings\/fiscal-periods\/generate$/)
  await page.getByRole('button', { name: /สร้าง 12 เดือน/i }).click()
  expect((await genRes).status()).toBe(200)
})

addFeasible('R2-08', 'Close fiscal period', async ({ page }) => {
  await page.goto('/settings/system')
  const closeRes = waitApi(page, 'PATCH', /\/api\/settings\/fiscal-periods\/[^/]+\/close$/)
  await page.getByRole('button', { name: /ปิดงวด/i }).first().click()
  expect((await closeRes).status()).toBe(200)
})

addFeasible('R2-08', 'Reopen fiscal period', async ({ page }) => {
  await page.goto('/settings/system')
  const reopenRes = waitApi(page, 'PATCH', /\/api\/settings\/fiscal-periods\/[^/]+\/reopen$/)
  await page.getByRole('button', { name: /เปิดงวดใหม่/i }).first().click()
  expect((await reopenRes).status()).toBe(200)
})

addFeasible('R2-08', 'Save notification channel preferences', async ({ page }) => {
  await page.goto('/settings/system')
  const saveRes = waitApi(page, 'PUT', /\/api\/settings\/notification-configs$/)
  await page.locator('input[type="checkbox"]').first().setChecked(false)
  expect((await saveRes).status()).toBe(200)
})

addFeasible('R2-09', 'Print invoice PDF', async ({ page, state }) => {
  await page.goto(`/finance/invoices/${state.invoices[0].id}`)
  const pdfRes = waitApi(page, 'GET', /\/api\/finance\/invoices\/[^/]+\/pdf$/)
  await page.getByRole('button', { name: /ดาวน์โหลด PDF/i }).click()
  expect((await pdfRes).status()).toBe(200)
})

addFeasible('R2-10', 'View full notifications inbox', async ({ page }) => {
  await page.goto('/notifications')
  await expect(page.getByText(/มีคำขอลาใหม่รออนุมัติ/i)).toBeVisible()
})

addFeasible('R2-10', 'Filter inbox by unread only', async ({ page }) => {
  await page.goto('/notifications')
  await page.getByRole('checkbox', { name: /เฉพาะยังไม่อ่าน/i }).check()
  await expect(page.getByText(/Invoice ใกล้ครบกำหนด/i)).toHaveCount(0)
})

addFeasible('R2-10', 'Mark all notifications as read', async ({ page }) => {
  await page.goto('/notifications')
  const markAllRes = waitApi(page, 'POST', /\/api\/notifications\/mark-all-read$/)
  await page.getByRole('button', { name: /อ่านทั้งหมด/i }).click()
  expect((await markAllRes).status()).toBe(200)
})

addFeasible('R2-11', 'View quotation list', async ({ page }) => {
  await page.goto('/finance/quotations')
  await expect(page.getByText('QT-2026-0001')).toBeVisible()
})

addFeasible('R2-11', 'Create quotation with required fields', async ({ page, state }) => {
  await page.goto('/finance/quotations/new')
  await page.locator('#qt-cust').selectOption(state.customers[0].id)
  await page.locator('#qt-issue').fill('2026-04-25')
  await page.locator('#qt-valid').fill('2026-05-25')
  await page.getByPlaceholder('Description').fill('บริการที่ปรึกษาเพิ่ม')

  const createRes = waitApi(page, 'POST', /\/api\/finance\/quotations$/)
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/finance\/quotations\//)
})

addFeasible('R2-11', 'Change quotation status', async ({ page }) => {
  await page.goto('/finance/quotations/qt-001')
  const patchRes = waitApi(page, 'PATCH', /\/api\/finance\/quotations\/[^/]+\/status$/)
  await page.getByRole('button', { name: /ทำเครื่องหมายว่าส่งแล้ว/i }).click()
  expect((await patchRes).status()).toBe(200)
})

addFeasible('R2-11', 'Convert quotation to sales order', async ({ page }) => {
  await page.goto('/finance/quotations/qt-001')
  const patchRes = waitApi(page, 'PATCH', /\/api\/finance\/quotations\/[^/]+\/status$/)
  await page.getByRole('button', { name: /ทำเครื่องหมายว่าส่งแล้ว/i }).click()
  expect((await patchRes).status()).toBe(200)

  const convertRes = waitApi(page, 'POST', /\/api\/finance\/quotations\/[^/]+\/convert-to-so$/)
  await page.getByRole('button', { name: /แปลงเป็นใบสั่งขาย/i }).click()
  expect((await convertRes).status()).toBe(200)
  await expect(page).toHaveURL(/\/finance\/sales-orders\//)
})

addFeasible('R2-11', 'View sales order list', async ({ page }) => {
  await page.goto('/finance/sales-orders')
  await expect(page.getByText('SO-2026-0001')).toBeVisible()
})

addFeasible('R2-11', 'Create sales order directly', async ({ page, state }) => {
  await page.goto('/finance/sales-orders/new')
  await page.locator('#so-cust').selectOption(state.customers[0].id)
  await page.locator('#so-od').fill('2026-04-26')
  await page.getByPlaceholder('Description').fill('บริการ implementation เพิ่มเติม')

  const createRes = waitApi(page, 'POST', /\/api\/finance\/sales-orders$/)
  await page.getByRole('button', { name: /บันทึก|save/i }).click()
  expect((await createRes).status()).toBe(201)
  await expect(page).toHaveURL(/\/finance\/sales-orders\//)
})

addFeasible('R2-11', 'Confirm sales order', async ({ page }) => {
  await page.goto('/finance/sales-orders/so-001')
  const patchRes = waitApi(page, 'PATCH', /\/api\/finance\/sales-orders\/[^/]+\/status$/)
  await page.getByRole('button', { name: /ยืนยันใบสั่ง/i }).click()
  expect((await patchRes).status()).toBe(200)
})

addFeasible('R2-11', 'Convert sales order to invoice', async ({ page }) => {
  await page.goto('/finance/sales-orders/so-001')
  const confirmRes = waitApi(page, 'PATCH', /\/api\/finance\/sales-orders\/[^/]+\/status$/)
  await page.getByRole('button', { name: /ยืนยันใบสั่ง/i }).click()
  expect((await confirmRes).status()).toBe(200)

  const convertRes = waitApi(page, 'POST', /\/api\/finance\/sales-orders\/[^/]+\/convert-to-invoice$/)
  await page.getByRole('button', { name: /สร้างใบแจ้งหนี้จาก SO/i }).click()
  expect((await convertRes).status()).toBe(200)
  await expect(page).toHaveURL(/\/finance\/invoices\//)
})

addFeasible('R2-12', 'Load global audit log viewer', async ({ page }) => {
  await page.goto('/settings/system')
  await expect(page.getByText('UPDATE_PERMISSIONS')).toBeVisible()
})

addFeasible('R2-13', 'Load global dashboard successfully', async ({ page }) => {
  await page.goto('/pm/global-dashboard')
  await expect(page.getByRole('heading', { name: /ภาพรวม PM/i })).toBeVisible()
  await expect(page.getByText(/จำนวน Budget/i)).toBeVisible()
})

test.describe('Testcase Mock Matrix @testcase_mock', () => {
  for (const doc of DOCS) {
    for (const title of doc.titles) {
      const key = `${doc.code}::${title}`
      const handler = feasibleHandlers.get(key)

      if (handler) {
        test(`[${doc.code}] ${title}`, { tag: '@testcase_mock' }, async ({ page, cdpScreencast }) => {
          const ref = refFromDoc(doc, title)
          annotateDocCase(test.info(), ref)

          const actor =
            title === 'Access denied for non-finance user' ||
            title === 'Access denied for non-admin user'
              ? NON_FINANCE_USER
              : SUPER_ADMIN

          await runMockCase(page, cdpScreencast, actor, test.info(), handler)
        })
      } else {
        test(
          `[${doc.code}] ${title}`,
          { tag: ['@testcase_mock', '@spec_gap'] },
          async ({}, testInfo) => {
            const ref = refFromDoc(doc, title)
            annotateDocCase(testInfo, ref)
            annotateSpecGap(testInfo, {
              ref,
              reason:
                'Flow ยังไม่ได้ automate แบบ deterministic ในรอบนี้ (เก็บเป็น spec-gap เพื่อ triage ตามเอกสาร)',
            })
            test.skip(true, 'spec-gap')
          },
        )
      }
    }
  }
})
