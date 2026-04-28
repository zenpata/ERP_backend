import { test, expect } from '../fixtures/cdp-screencast'
import {
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
  installHrOrganizationRouter,
  mockDepartment,
  mockPosition,
} from './helpers/hr-organization-fixtures'
import { mockEmployee } from './helpers/hr-fixtures'

const GOOD = 'password123'

const MOCK_HR_ORG_ADMIN = {
  id: 'u-hr-org-admin',
  email: 'hr-org-admin@erp.com',
  name: 'HR Org Admin',
  roles: ['hr_admin'],
  permissions: ['hr:department:view', 'hr:department:edit', 'hr:employee:view'],
}

const MOCK_HR_ORG_READONLY = {
  id: 'u-hr-org-view',
  email: 'hr-org-readonly@erp.com',
  name: 'HR Org Readonly',
  roles: ['hr_staff'],
  permissions: ['hr:department:view'],
}

function buildOrgSeed() {
  const departments = [
    mockDepartment({
      id: 'dept-001',
      code: 'D001',
      name: 'ฝ่ายบริหาร',
      parentId: null,
      managerId: 'e-mgr-001',
    }),
    mockDepartment({
      id: 'dept-002',
      code: 'D002',
      name: 'ฝ่ายบุคคล',
      parentId: 'dept-001',
      managerId: 'e-mgr-001',
    }),
    mockDepartment({
      id: 'dept-003',
      code: 'D003',
      name: 'ฝ่ายไอที',
      parentId: 'dept-001',
      managerId: 'e-mgr-002',
    }),
  ]

  const positions = [
    mockPosition({
      id: 'pos-001',
      code: 'P001',
      name: 'HR Specialist',
      departmentId: 'dept-002',
      level: 2,
    }),
    mockPosition({
      id: 'pos-002',
      code: 'P002',
      name: 'Software Engineer',
      departmentId: 'dept-003',
      level: 3,
    }),
  ]

  const activeEmployees = [
    mockEmployee({
      id: 'e-mgr-001',
      code: 'EMP00001',
      firstnameTh: 'สมชาย',
      lastnameTh: 'หัวหน้าบุคคล',
      status: 'active',
      departmentId: 'dept-002',
      positionId: 'pos-001',
    }),
    mockEmployee({
      id: 'e-mgr-002',
      code: 'EMP00002',
      firstnameTh: 'ศิริพร',
      lastnameTh: 'หัวหน้าไอที',
      status: 'active',
      departmentId: 'dept-003',
      positionId: 'pos-002',
    }),
  ]

  return { departments, positions, activeEmployees }
}

function formatQueryViolation(v: {
  endpoint: string
  query: Record<string, string>
  fields: Record<string, string>
}) {
  return `${v.endpoint} query=${JSON.stringify(v.query)} fields=${JSON.stringify(v.fields)}`
}

type ApiHttpError = {
  method: string
  path: string
  status: number
}

function startApiHttpErrorCollector(page: import('@playwright/test').Page) {
  const errors: ApiHttpError[] = []
  const onResponse = (response: import('@playwright/test').Response) => {
    const status = response.status()
    if (status < 400 || status > 599) return
    if (response.request().method() === 'OPTIONS') return
    try {
      const path = new URL(response.url()).pathname
      if (!path.startsWith('/api/')) return
      errors.push({
        method: response.request().method(),
        path,
        status,
      })
    } catch {
      // ignore malformed URLs from non-http schemes
    }
  }
  page.on('response', onResponse)
  return {
    errors,
    stop: () => page.off('response', onResponse),
  }
}

function formatApiHttpError(err: ApiHttpError) {
  return `${err.method} ${err.path} -> ${err.status}`
}

function departmentSection(page: import('@playwright/test').Page) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: /แผนก \(Departments\)/ }) })
    .first()
}

function positionSection(page: import('@playwright/test').Page) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: /ตำแหน่ง \(Positions\)/ }) })
    .first()
}

async function loginAs(
  page: import('@playwright/test').Page,
  user: { email: string; id: string; name: string; roles: string[]; permissions: string[] } = MOCK_HR_ORG_ADMIN,
) {
  await clearAuthStorage(page)
  await installConditionalLoginSuccess(page, user, GOOD)
  await page.route(apiUrlGlob('auth/me'), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await fulfillJson(route, 200, ok(user))
  })
  await installDashboardSummaryMock(page)
  await installNotificationUnreadMock(page)
  await page.goto('/login')
  await submitLogin(page, user.email, GOOD)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}

test.describe.configure({ mode: 'parallel' })

test.describe(
  'R1-03 — 20 test cases (Documents/Testcase/R1-03_testcases.md)',
  { tag: '@testcase_mock' },
  () => {
  test.beforeEach(async ({ page, cdpScreencast }) => {
    await cdpScreencast.startCdpScreencast(page)
  })

  test.afterEach(async ({ page, cdpScreencast }) => {
    await cdpScreencast.stopCdpScreencast()
    await page.context().unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('0. No unexpected 4xx/5xx while using organization tabs', async ({ page }) => {
    const violations: string[] = []
    const httpErrors = startApiHttpErrorCollector(page)
    try {
      await installHrOrganizationRouter(page, {
        ...buildOrgSeed(),
        onQueryViolation: (v) => violations.push(formatQueryViolation(v)),
      })
      await loginAs(page)
      await page.goto('/hr/organization')

      const dept = departmentSection(page)
      const pos = positionSection(page)
      const deptRows = dept.locator('div.divide-y').first()
      const posRows = pos.locator('div.divide-y').first()

      await expect(deptRows).toContainText('D001')
      await expect(posRows).toContainText('P001')

      await dept.getByPlaceholder('ค้นหาชื่อแผนก…').fill('D002')
      await expect(deptRows).toContainText('D002')
      await dept.getByRole('button', { name: 'ดูรายละเอียด' }).first().click()
      const deptDetailModal = page.getByRole('dialog')
      await expect(deptDetailModal).toContainText('รายละเอียดแผนก')
      await deptDetailModal.locator('button').last().click()
      await expect(page.getByRole('dialog')).toHaveCount(0)

      await pos.getByPlaceholder('ค้นหาชื่อตำแหน่ง…').fill('P002')
      await expect(posRows).toContainText('P002')
      await pos.getByRole('button', { name: 'ดูรายละเอียด' }).first().click()
      const posDetailModal = page.getByRole('dialog')
      await expect(posDetailModal).toContainText('รายละเอียดตำแหน่ง')
      await posDetailModal.locator('button').last().click()
      await expect(page.getByRole('dialog')).toHaveCount(0)

      await page.goto('/hr/employees/new')
      await expect(page.locator('#emp-departmentId option')).toHaveCount(4)
      await expect(page.locator('#emp-positionId option')).toHaveCount(3)
    } finally {
      httpErrors.stop()
    }
    expect(
      violations,
      `Frontend sent invalid query that backend would reject:\n${violations.join('\n')}`,
    ).toEqual([])
    expect(
      httpErrors.errors,
      `Unexpected API 4xx/5xx responses:\n${httpErrors.errors.map(formatApiHttpError).join('\n')}`,
    ).toEqual([])
  })

  test('1. Load department list', async ({ page }) => {
    const violations: string[] = []
    await installHrOrganizationRouter(page, {
      ...buildOrgSeed(),
      onQueryViolation: (v) => violations.push(formatQueryViolation(v)),
    })
    await loginAs(page)
    await page.goto('/hr/organization')

    const deptRows = departmentSection(page).locator('div.divide-y').first()
    await expect(deptRows).toContainText('D001')
    await expect(deptRows).toContainText('D002')
    await expect(deptRows).toContainText('D003')
    expect(
      violations,
      `Frontend sent invalid query that backend would reject:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  test('2. Search department by name or code', async ({ page }) => {
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    const deptRows = dept.locator('div.divide-y').first()
    const search = dept.getByPlaceholder('ค้นหาชื่อแผนก…')

    await search.fill('บุคคล')
    await expect(deptRows).toContainText('D002')
    await expect(deptRows).not.toContainText('D003')

    await search.fill('D003')
    await expect(deptRows).toContainText('D003')
    await expect(deptRows).not.toContainText('D002')
  })

  test('3. View department detail', { tag: '@e2e_scenario' }, async ({ page }) => {
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    await dept.getByPlaceholder('ค้นหาชื่อแผนก…').fill('D002')
    await dept.getByRole('button', { name: 'ดูรายละเอียด' }).first().click()

    const modal = page.getByRole('dialog')
    await expect(modal).toContainText('รายละเอียดแผนก')
    await expect(modal).toContainText('D002')
    await expect(modal).toContainText('ฝ่ายบุคคล')
    await expect(modal).toContainText('ฝ่ายบริหาร')
  })

  test('4. Create department with required fields', { tag: '@e2e_scenario' }, async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-gap',
      description: 'Current UI has no editable code field in create department form.',
    })
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    await dept.getByRole('button', { name: 'เพิ่มแผนก' }).click()
    await page.getByRole('dialog').getByLabel('ชื่อแผนก').fill('ฝ่ายจัดซื้อ')
    await page.getByRole('dialog').getByRole('button', { name: 'บันทึก' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(dept.locator('div.divide-y').first()).toContainText('ฝ่ายจัดซื้อ')
  })

  test('5. Create department fails with duplicate code', async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-gap',
      description:
        'Spec says duplicate code validation via code input, but current create form has no code field.',
    })
    const seed = buildOrgSeed()
    await installHrOrganizationRouter(page, {
      ...seed,
      postDepartment: async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'รหัสแผนกซ้ำ',
            statusCode: 409,
          }),
        })
      },
    })
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    await dept.getByRole('button', { name: 'เพิ่มแผนก' }).click()
    await page.getByRole('dialog').getByLabel('ชื่อแผนก').fill('ฝ่ายที่ชนรหัส')
    await page.getByRole('dialog').getByRole('button', { name: 'บันทึก' }).click()
    await expect(page.getByRole('dialog')).toContainText('รหัสแผนกซ้ำ')
  })

  test('6. Create department with parent department', { tag: '@e2e_scenario' }, async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-gap',
      description: 'Current create form auto-generates code; test validates parent assignment only.',
    })
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    await dept.getByRole('button', { name: 'เพิ่มแผนก' }).click()
    const modal = page.getByRole('dialog')
    await modal.getByLabel('ชื่อแผนก').fill('แผนกย่อยจัดซื้อ')
    await modal.getByLabel('แผนกแม่').selectOption('dept-001')
    await modal.getByRole('button', { name: 'บันทึก' }).click()

    const deptRows = dept.locator('div.divide-y').first()
    await expect(deptRows).toContainText('แผนกย่อยจัดซื้อ')
    await expect(deptRows).toContainText('ฝ่ายบริหาร')
  })

  test('7. Edit department name', { tag: '@e2e_scenario' }, async ({ page }) => {
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    const deptRows = dept.locator('div.divide-y').first()
    await dept.getByPlaceholder('ค้นหาชื่อแผนก…').fill('D002')
    await dept.getByRole('button', { name: 'แก้ไข' }).first().click()

    const modal = page.getByRole('dialog')
    await modal.getByLabel('ชื่อแผนก').fill('ฝ่ายบุคคลและธุรการ')
    await modal.getByRole('button', { name: 'บันทึก' }).click()

    await expect(deptRows).toContainText('ฝ่ายบุคคลและธุรการ')
  })

  test('8. Delete department with no employees', { tag: '@e2e_scenario' }, async ({ page }) => {
    const seed = buildOrgSeed()
    await installHrOrganizationRouter(page, {
      ...seed,
      activeEmployees: seed.activeEmployees.filter((e) => e.departmentId !== 'dept-003'),
    })
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    const deptRows = dept.locator('div.divide-y').first()
    await dept.getByPlaceholder('ค้นหาชื่อแผนก…').fill('D003')
    await dept.getByRole('button', { name: 'ลบ' }).first().click()
    await expect(deptRows).not.toContainText('D003')
  })

  test('9. Delete department blocked when has active employees', async ({ page }) => {
    await installHrOrganizationRouter(page, {
      ...buildOrgSeed(),
      deleteDepartment: async (route, id) => {
        if (id === 'dept-002') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'ยังมีพนักงาน active ในแผนก',
              statusCode: 409,
            }),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: null }),
        })
      },
    })
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    const deptRows = dept.locator('div.divide-y').first()
    await dept.getByPlaceholder('ค้นหาชื่อแผนก…').fill('D002')
    await dept.getByRole('button', { name: 'ลบ' }).first().click()

    await expect(dept).toContainText('ยังมีพนักงาน active ในแผนก')
    await expect(deptRows).toContainText('D002')
  })

  test('10. Delete department blocked when has child departments', async ({ page }) => {
    await installHrOrganizationRouter(page, {
      ...buildOrgSeed(),
      deleteDepartment: async (route, id) => {
        if (id === 'dept-001') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'มีแผนกลูกอยู่',
              statusCode: 409,
            }),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: null }),
        })
      },
    })
    await loginAs(page)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    const deptRows = dept.locator('div.divide-y').first()
    await dept.getByPlaceholder('ค้นหาชื่อแผนก…').fill('D001')
    await dept.getByRole('button', { name: 'ลบ' }).first().click()

    await expect(dept).toContainText('มีแผนกลูกอยู่')
    await expect(deptRows).toContainText('D001')
  })

  test('11. Cancel department delete stays on detail (spec vs current app)', async () => {
    test.skip(
      true,
      'OrganizationPage deletes immediately via icon action; no confirm modal/cancel flow in current UI.',
    )
  })

  test('12. Load position list', async ({ page }) => {
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)
    await page.goto('/hr/organization')

    const posRows = positionSection(page).locator('div.divide-y').first()
    await expect(posRows).toContainText('P001')
    await expect(posRows).toContainText('P002')
  })

  test('13. Create position with required fields', { tag: '@e2e_scenario' }, async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-gap',
      description: 'Current position create form does not expose code field; code is backend-generated.',
    })
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)
    await page.goto('/hr/organization')

    const pos = positionSection(page)
    const posRows = pos.locator('div.divide-y').first()
    await pos.getByRole('button', { name: 'เพิ่มตำแหน่ง' }).click()

    const modal = page.getByRole('dialog')
    await modal.getByLabel('ชื่อตำแหน่ง').fill('Project Coordinator')
    await modal.getByLabel('แผนก').selectOption('dept-001')
    await modal.getByLabel('ระดับ').fill('4')
    await modal.getByRole('button', { name: 'บันทึก' }).click()

    await expect(posRows).toContainText('Project Coordinator')
    await expect(posRows).toContainText('ระดับ: 4')
  })

  test('14. Create position fails with duplicate code', async ({ page }) => {
    test.info().annotations.push({
      type: 'spec-gap',
      description:
        'Spec requires duplicate code check, but current UI has no code input; backend duplicate simulation is asserted.',
    })
    await installHrOrganizationRouter(page, {
      ...buildOrgSeed(),
      postPosition: async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'รหัสตำแหน่งซ้ำ',
            statusCode: 409,
          }),
        })
      },
    })
    await loginAs(page)
    await page.goto('/hr/organization')

    const pos = positionSection(page)
    await pos.getByRole('button', { name: 'เพิ่มตำแหน่ง' }).click()
    const modal = page.getByRole('dialog')
    await modal.getByLabel('ชื่อตำแหน่ง').fill('ตำแหน่งที่ชนรหัส')
    await modal.getByRole('button', { name: 'บันทึก' }).click()

    await expect(modal).toContainText('รหัสตำแหน่งซ้ำ')
  })

  test('15. Edit position name and level', { tag: '@e2e_scenario' }, async ({ page }) => {
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)
    await page.goto('/hr/organization')

    const pos = positionSection(page)
    const posRows = pos.locator('div.divide-y').first()
    await pos.getByPlaceholder('ค้นหาชื่อตำแหน่ง…').fill('P001')
    await pos.getByRole('button', { name: 'แก้ไข' }).first().click()

    const modal = page.getByRole('dialog')
    await modal.getByLabel('ชื่อตำแหน่ง').fill('HR Business Partner')
    await modal.getByLabel('ระดับ').fill('5')
    await modal.getByRole('button', { name: 'บันทึก' }).click()

    await expect(posRows).toContainText('HR Business Partner')
    await expect(posRows).toContainText('ระดับ: 5')
  })

  test('16. Delete position with no employees', { tag: '@e2e_scenario' }, async ({ page }) => {
    const seed = buildOrgSeed()
    await installHrOrganizationRouter(page, {
      ...seed,
      activeEmployees: seed.activeEmployees.filter((e) => e.positionId !== 'pos-002'),
    })
    await loginAs(page)
    await page.goto('/hr/organization')

    const pos = positionSection(page)
    const posRows = pos.locator('div.divide-y').first()
    await pos.getByPlaceholder('ค้นหาชื่อตำแหน่ง…').fill('P002')
    await pos.getByRole('button', { name: 'ลบ' }).first().click()
    await expect(posRows).not.toContainText('P002')
  })

  test('17. Delete position blocked when has active employees', async ({ page }) => {
    await installHrOrganizationRouter(page, {
      ...buildOrgSeed(),
      deletePosition: async (route, id) => {
        if (id === 'pos-001') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'ต้องย้ายพนักงานออกจากตำแหน่งนี้ก่อน',
              statusCode: 409,
            }),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: null }),
        })
      },
    })
    await loginAs(page)
    await page.goto('/hr/organization')

    const pos = positionSection(page)
    const posRows = pos.locator('div.divide-y').first()
    await pos.getByPlaceholder('ค้นหาชื่อตำแหน่ง…').fill('P001')
    await pos.getByRole('button', { name: 'ลบ' }).first().click()

    await expect(pos).toContainText('ต้องย้ายพนักงานออกจากตำแหน่งนี้ก่อน')
    await expect(posRows).toContainText('P001')
  })

  test('18. Department dropdown used in employee form', async ({ page }) => {
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)

    await page.goto('/hr/employees/new')
    const deptOptions = page.locator('#emp-departmentId option')
    await expect(deptOptions).toHaveCount(4)
    await expect(deptOptions.nth(1)).toContainText('ฝ่ายบริหาร')
    await expect(deptOptions.nth(2)).toContainText('ฝ่ายบุคคล')
    await expect(deptOptions.nth(3)).toContainText('ฝ่ายไอที')
  })

  test('19. Position dropdown used in employee form', async ({ page }) => {
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page)

    await page.goto('/hr/employees/new')
    const posOptions = page.locator('#emp-positionId option')
    await expect(posOptions).toHaveCount(3)
    await expect(posOptions.nth(1)).toContainText('HR Specialist')
    await expect(posOptions.nth(2)).toContainText('Software Engineer')
  })

  test('20. Read-only user sees organization without edit buttons', async ({ page }) => {
    await installHrOrganizationRouter(page, buildOrgSeed())
    await loginAs(page, MOCK_HR_ORG_READONLY)
    await page.goto('/hr/organization')

    const dept = departmentSection(page)
    const pos = positionSection(page)

    await expect(dept).toContainText('มีสิทธิ์ดูเท่านั้น')
    await expect(pos).toContainText('มีสิทธิ์ดูเท่านั้น')
    await expect(page.getByRole('button', { name: 'เพิ่มแผนก' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'เพิ่มตำแหน่ง' })).toHaveCount(0)
    await expect(dept.getByRole('button', { name: 'แก้ไข' })).toHaveCount(0)
    await expect(pos.getByRole('button', { name: 'แก้ไข' })).toHaveCount(0)
    await expect(dept.getByRole('button', { name: 'ลบ' })).toHaveCount(0)
    await expect(pos.getByRole('button', { name: 'ลบ' })).toHaveCount(0)
    await expect(dept.getByRole('button', { name: 'ดูรายละเอียด' })).toHaveCount(3)
    await expect(pos.getByRole('button', { name: 'ดูรายละเอียด' })).toHaveCount(2)
  })
  },
)
