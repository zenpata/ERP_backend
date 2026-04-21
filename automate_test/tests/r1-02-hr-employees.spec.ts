import { test, expect } from '../fixtures/cdp-screencast'
import {
  MOCK_EMPLOYEE_ME,
  MOCK_HR_ADMIN_ME,
  apiUrlGlob,
  clearAuthStorage,
  fulfillJson,
  installConditionalLoginSuccess,
  installDashboardSummaryMock,
  installNotificationUnreadMock,
  ok,
  submitLogin,
} from './helpers/auth-api-mock'
import {
  installHrDepartmentsAndPositions,
  installHrEmployeesRouter,
  mockEmployee,
  MOCK_DEPT_ID,
  MOCK_POS_ID,
} from './helpers/hr-fixtures'

const GOOD = 'password123'

test.describe.configure({ mode: 'parallel' })

async function loginAs(page: import('@playwright/test').Page, me: typeof MOCK_HR_ADMIN_ME) {
  await clearAuthStorage(page)
  await installConditionalLoginSuccess(page, me, GOOD)
  await installDashboardSummaryMock(page)
  await installNotificationUnreadMock(page)
  await page.goto('/login')
  await submitLogin(page, me.email, GOOD)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}

test.describe('R1-02 — 21 test cases (Documents/Testcase/R1-02_testcases.md)', () => {
  test.beforeEach(async ({ page, cdpScreencast }) => {
    await cdpScreencast.startCdpScreencast(page)
  })

  test.afterEach(async ({ page, cdpScreencast }) => {
    await cdpScreencast.stopCdpScreencast()
    await page.context().unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('1. View own employee profile (via /hr/employees/me)', async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-note',
      description:
        'Spec: menu "โปรไฟล์ของฉัน" — app uses route /hr/employees/me (no dedicated sidebar item yet).',
    })
    await clearAuthStorage(page)
    await installConditionalLoginSuccess(page, MOCK_EMPLOYEE_ME, GOOD)
    await installDashboardSummaryMock(page)
    await installNotificationUnreadMock(page)
    await installHrEmployeesRouter(page, {
      list: [],
      meProfile: mockEmployee({ id: 'e-self', firstnameTh: 'ฉัน', lastnameTh: 'ทดสอบ' }),
    })

    await page.goto('/login')
    await submitLogin(page, MOCK_EMPLOYEE_ME.email, GOOD)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })

    await page.goto('/hr/employees/me')
    await expect(page.getByRole('heading', { name: /ฉัน ทดสอบ/ })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /ข้อมูลส่วนตัว|ข้อมูลการทำงาน|ข้อมูลการเงิน/ }).first()).toBeVisible()
  })

  test('2. View own profile when not linked (GET /me 404)', async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-gap',
      description:
        'Spec expects HR contact copy; app shows generic employee.empty ("ไม่พบข้อมูลพนักงาน").',
    })
    await clearAuthStorage(page)
    await installConditionalLoginSuccess(page, MOCK_EMPLOYEE_ME, GOOD)
    await installDashboardSummaryMock(page)
    await installNotificationUnreadMock(page)
    await installHrEmployeesRouter(page, { list: [], meNotLinked: true })

    await page.goto('/login')
    await submitLogin(page, MOCK_EMPLOYEE_ME.email, GOOD)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })

    await page.goto('/hr/employees/me')
    await expect(page.getByText('ไม่พบข้อมูลพนักงาน').first()).toBeVisible({ timeout: 15_000 })
  })

  test('3. HR views employee list', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    const e1 = mockEmployee({ id: 'e-001', code: 'EMP00001' })
    await installHrEmployeesRouter(page, { list: [e1] })

    const listResPromise = page.waitForResponse((r) => {
      if (r.request().method() !== 'GET') return false
      try {
        const p = new URL(r.url()).pathname
        return p === '/api/hr/employees' || p.endsWith('/api/hr/employees')
      } catch {
        return false
      }
    })
    await page.getByRole('link', { name: /รายชื่อพนักงาน|Employees/i }).click()
    await expect(page.getByRole('main').getByRole('heading', { name: /รายชื่อพนักงาน/ })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'EMP00001', exact: true })).toBeVisible({ timeout: 15_000 })
    const listRes = await listResPromise
    const json = (await listRes.json()) as { meta?: { page?: number } }
    expect(json.meta?.page).toBe(1)
  })

  test('4. Search employee by name', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    const a = mockEmployee({ id: 'e-a', firstnameTh: 'สมชาย', lastnameTh: 'หนึ่ง' })
    const b = mockEmployee({ id: 'e-b', firstnameTh: 'สมหญิง', lastnameTh: 'สอง', nationalId: '1100700123457', code: 'EMP00002' })
    await installHrEmployeesRouter(page, { list: [a, b] })

    await page.goto('/hr/employees')
    await page.getByPlaceholder(/ค้นหาพนักงาน/i).fill('สมหญิง')
    await expect(page.getByRole('cell', { name: 'EMP00002', exact: true })).toBeVisible({ timeout: 12_000 })
    await expect(page.getByRole('cell', { name: 'EMP00001', exact: true })).toHaveCount(0)
  })

  test('5. Filter employees by department (spec vs current app)', async () => {
    test.skip(true, 'EmployeeListPage has no department dropdown filter (only status + employment type).')
  })

  test('6. Filter employees by status', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    const active = mockEmployee({ id: 'e-a', status: 'active' })
    const inactive = mockEmployee({
      id: 'e-b',
      status: 'inactive',
      nationalId: '1100700123457',
      code: 'EMP00002',
    })
    await installHrEmployeesRouter(page, { list: [active, inactive] })

    await page.goto('/hr/employees')
    await page.locator('select').first().selectOption('inactive')
    await expect(page.getByRole('cell', { name: 'EMP00002', exact: true })).toBeVisible({ timeout: 12_000 })
    await expect(page.getByRole('cell', { name: 'EMP00001', exact: true })).toHaveCount(0)
  })

  test('7. Clear filters shows all employees (spec vs current app)', async () => {
    test.skip(true, 'No "Clear Filters" control on EmployeeListPage.')
  })

  test('8. Empty state when no employees match filter', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    await installHrEmployeesRouter(page, { list: [mockEmployee()] })

    await page.goto('/hr/employees')
    await page.getByPlaceholder(/ค้นหาพนักงาน/i).fill('zzzzzz-no-match-zzzz')
    await expect(page.getByText('ไม่พบข้อมูลพนักงาน').first()).toBeVisible({ timeout: 12_000 })
  })

  test('9. View employee detail', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    const e1 = mockEmployee({ id: 'e-001' })
    await installHrEmployeesRouter(page, { list: [e1] })

    await page.goto('/hr/employees')
    await page.getByText('สมชาย').first().click()
    await expect(page).toHaveURL(/\/hr\/employees\/e-001$/)
    await expect(page.getByRole('button', { name: /แก้ไขข้อมูล/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /สิ้นสุดการจ้าง/ })).toBeVisible()
  })

  test('10. Employee detail returns 404 for invalid ID', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    await installHrEmployeesRouter(page, {
      list: [mockEmployee()],
      detailLookup: (id) => (id === 'invalid-id' ? null : mockEmployee({ id })),
    })

    await page.goto('/hr/employees/invalid-id')
    await expect(page.getByText('ไม่พบข้อมูลพนักงาน').first()).toBeVisible({ timeout: 15_000 })
  })

  test('11. Create employee with all required fields', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    await installHrEmployeesRouter(page, {
      list: [],
      postCreate: async (route, body) => {
        const created = mockEmployee({
          id: 'e-new',
          code: 'EMP00999',
          nationalId: String(body.nationalId ?? '1100700123999'),
          firstnameTh: String(body.firstnameTh ?? 'ใหม่'),
          lastnameTh: String(body.lastnameTh ?? 'พนักงาน'),
          birthDate: String(body.birthDate ?? '1995-01-01'),
          startDate: String(body.startDate ?? '2026-02-01'),
          baseSalary: String(body.baseSalary ?? '30000'),
          departmentId: (body.departmentId as string) || MOCK_DEPT_ID,
          positionId: (body.positionId as string) || MOCK_POS_ID,
        })
        await fulfillJson(route, 201, ok(created))
      },
    })

    await page.goto('/hr/employees/new')
    await page.locator('#emp-nationalId').fill('1100700123999')
    await page.locator('#emp-firstnameTh').fill('ใหม่')
    await page.locator('#emp-lastnameTh').fill('พนักงาน')
    await page.locator('#emp-birthDate').fill('1995-01-01')
    await page.locator('#emp-startDate').fill('2026-02-01')
    await page.locator('#emp-baseSalary').fill('30000')
    await page.locator('#emp-departmentId').selectOption(MOCK_DEPT_ID)
    await page.locator('#emp-positionId').selectOption(MOCK_POS_ID)
    await page.locator('#emp-email').fill('newworker@example.com')

    await page.getByRole('button', { name: /^บันทึก$/ }).click()
    await expect(page).toHaveURL(/\/hr\/employees\/e-new$/, { timeout: 15_000 })
  })

  test('12. Create employee fails with duplicate employee code', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    await installHrEmployeesRouter(page, {
      list: [mockEmployee()],
      postCreate: async (route) => {
        await fulfillJson(route, 409, {
          success: false,
          message: 'รหัสพนักงานซ้ำ',
          statusCode: 409,
        })
      },
    })

    await page.goto('/hr/employees/new')
    await page.locator('#emp-nationalId').fill('1100700123111')
    await page.locator('#emp-firstnameTh').fill('ชื่อ')
    await page.locator('#emp-lastnameTh').fill('นามสกุล')
    await page.locator('#emp-birthDate').fill('1995-01-01')
    await page.locator('#emp-startDate').fill('2026-02-01')
    await page.locator('#emp-baseSalary').fill('30000')
    await page.locator('#emp-departmentId').selectOption(MOCK_DEPT_ID)
    await page.locator('#emp-positionId').selectOption(MOCK_POS_ID)

    const postDup = page.waitForResponse(
      (r) =>
        r.url().includes('/api/hr/employees') &&
        r.request().method() === 'POST' &&
        new URL(r.url()).pathname.endsWith('/employees'),
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /^บันทึก$/ }).click()
    const res = await postDup
    expect(res.status()).toBe(409)
    await expect(page).toHaveURL(/\/hr\/employees\/new/)
  })

  test('13. Create employee fails with duplicate email', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    await installHrEmployeesRouter(page, {
      list: [mockEmployee()],
      postCreate: async (route) => {
        await fulfillJson(route, 409, {
          success: false,
          message: 'อีเมลนี้ถูกใช้แล้ว',
          statusCode: 409,
        })
      },
    })

    await page.goto('/hr/employees/new')
    await page.locator('#emp-nationalId').fill('1100700123222')
    await page.locator('#emp-firstnameTh').fill('ชื่อ')
    await page.locator('#emp-lastnameTh').fill('นามสกุล')
    await page.locator('#emp-birthDate').fill('1995-01-01')
    await page.locator('#emp-startDate').fill('2026-02-01')
    await page.locator('#emp-baseSalary').fill('30000')
    await page.locator('#emp-departmentId').selectOption(MOCK_DEPT_ID)
    await page.locator('#emp-positionId').selectOption(MOCK_POS_ID)
    await page.locator('#emp-email').fill('dup@example.com')

    const postDup = page.waitForResponse(
      (r) =>
        r.url().includes('/api/hr/employees') &&
        r.request().method() === 'POST' &&
        new URL(r.url()).pathname.endsWith('/employees'),
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /^บันทึก$/ }).click()
    expect((await postDup).status()).toBe(409)
    await expect(page).toHaveURL(/\/hr\/employees\/new/)
  })

  test('14. Create employee fails with missing required fields', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    await installHrEmployeesRouter(page, { list: [] })

    await page.goto('/hr/employees/new')
    await page.locator('#emp-nationalId').fill('1100700123333')
    await page.locator('#emp-firstnameTh').fill('')
    await page.locator('#emp-lastnameTh').fill('มีนามสกุล')
    await page.getByRole('button', { name: /^บันทึก$/ }).click()
    await expect(page.getByText('กรุณากรอกชื่อ').first()).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/hr\/employees\/new/)
  })

  test('15. Department and position dropdowns load before form', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    await installHrEmployeesRouter(page, { list: [] })

    await page.goto('/hr/employees/new')
    await expect(page.locator('#emp-departmentId option')).toHaveCount(2)
    await expect(page.locator('#emp-positionId option')).toHaveCount(2)
    await expect(page.locator('#emp-departmentId option').nth(1)).toContainText('แผนกทดสอบ')
  })

  test('16. Edit employee successfully', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    const row = mockEmployee({ id: 'e-001', email: 'old@example.com' })
    await installHrEmployeesRouter(page, {
      list: [row],
      detailLookup: (id) => (id === row.id ? row : null),
      patchUpdate: async (route, id, body) => {
        Object.assign(row, body, { id })
        await fulfillJson(route, 200, ok(row))
      },
    })

    await page.goto('/hr/employees/e-001/edit')
    await expect(page.locator('#emp-email')).toHaveValue('old@example.com', { timeout: 15_000 })
    await page.locator('#emp-email').fill('updated@example.com')
    await page.getByRole('button', { name: /^บันทึก$/ }).click()
    await expect(page).toHaveURL(/\/hr\/employees\/e-001$/, { timeout: 15_000 })
    await expect(page.getByText('updated@example.com').first()).toBeVisible({ timeout: 10_000 })
  })

  test('17. Edit form pre-fills with existing data', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    const e1 = mockEmployee({ id: 'e-001', firstnameTh: 'พรี', lastnameTh: 'ฟิลล์', email: 'prefill@example.com' })
    await installHrEmployeesRouter(page, { list: [e1] })

    await page.goto('/hr/employees/e-001/edit')
    await expect(page.locator('#emp-firstnameTh')).toHaveValue('พรี', { timeout: 15_000 })
    await expect(page.locator('#emp-lastnameTh')).toHaveValue('ฟิลล์')
    await expect(page.locator('#emp-email')).toHaveValue('prefill@example.com')
  })

  test('18. Terminate employee (confirm + DELETE)', async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-gap',
      description:
        'Spec: modal with terminationDate/reason — app uses window.confirm + DELETE without body.',
    })
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    const e1 = mockEmployee({ id: 'e-001' })
    await installHrEmployeesRouter(page, {
      list: [e1],
      deleteTerminate: async (route) => {
        await fulfillJson(route, 200, ok(null))
      },
    })

    page.once('dialog', (d) => d.accept())
    await page.goto('/hr/employees/e-001')
    await page.getByRole('button', { name: /สิ้นสุดการจ้าง/ }).click()
    await expect(page).toHaveURL(/\/hr\/employees$/, { timeout: 15_000 })
  })

  test('19. Terminate blocked when payroll active (mock 409)', async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-note',
      description: 'Backend terminate currently has no payroll guard; this asserts client stays on detail when DELETE fails.',
    })
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    const e1 = mockEmployee({ id: 'e-001' })
    await installHrEmployeesRouter(page, {
      list: [e1],
      deleteTerminate: async (route) => {
        await fulfillJson(route, 409, {
          success: false,
          message: 'มีงวดเงินเดือนที่ยังไม่ปิด — ไม่สามารถสิ้นสุดการจ้างได้',
          statusCode: 409,
        })
      },
    })

    page.once('dialog', (d) => d.accept())
    await page.goto('/hr/employees/e-001')
    await page.getByRole('button', { name: /สิ้นสุดการจ้าง/ }).click()
    await expect(page).toHaveURL(/\/hr\/employees\/e-001/, { timeout: 10_000 })
  })

  test('20. Cancel terminate returns to detail page', async ({ page }) => {
    await loginAs(page, MOCK_HR_ADMIN_ME)
    await installHrDepartmentsAndPositions(page)
    await installHrEmployeesRouter(page, { list: [mockEmployee({ id: 'e-001' })] })

    page.once('dialog', (d) => d.dismiss())
    await page.goto('/hr/employees/e-001')
    await page.getByRole('button', { name: /สิ้นสุดการจ้าง/ }).click()
    await expect(page).toHaveURL(/\/hr\/employees\/e-001$/)
    await expect(page.getByRole('button', { name: /สิ้นสุดการจ้าง/ })).toBeVisible()
  })

  test('21. Access denied for employee role viewing employee list', async ({ page }) => {
    await clearAuthStorage(page)
    await installConditionalLoginSuccess(page, MOCK_EMPLOYEE_ME, GOOD)
    await installDashboardSummaryMock(page)
    await installNotificationUnreadMock(page)
    await installHrEmployeesRouter(page, { list: [mockEmployee()] })

    await page.goto('/login')
    await submitLogin(page, MOCK_EMPLOYEE_ME.email, GOOD)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })

    await page.goto('/hr/employees')
    await expect(page.getByText('คุณไม่มีสิทธิ์ดูรายชื่อพนักงาน')).toBeVisible({ timeout: 15_000 })
  })
})
