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
  type AuthMePayload,
} from './helpers/auth-api-mock'
import {
  installHrOrganizationRouter,
  mockDepartment,
  mockPosition,
} from './helpers/hr-organization-fixtures'
import { mockEmployee } from './helpers/hr-fixtures'

const GOOD = 'password123'

const MOCK_SUPER_ADMIN: AuthMePayload = {
  id: 'u-super-admin',
  email: 'somchai@alphacorp.com',
  name: 'Somchai',
  roles: ['super_admin'],
  permissions: [
    'sys:settings:view',
    'sys:settings:edit',
    'sys:roles:view',
    'sys:users:view',
    'sys:users:create',
  ],
}

const MOCK_HR_ADMIN: AuthMePayload = {
  id: 'u-hr-admin',
  email: 'malee@alphacorp.com',
  name: 'Malee',
  roles: ['hr_admin'],
  permissions: [
    'hr:department:view',
    'hr:department:edit',
    'hr:position:view',
    'hr:position:edit',
    'hr:employee:view',
    'hr:employee:edit',
    'hr:leave:view',
    'hr:leave:approve',
    'hr:payroll:view',
    'hr:payroll:process',
  ],
}

const MOCK_FINANCE_MANAGER: AuthMePayload = {
  id: 'u-finance-manager',
  email: 'wichai@alphacorp.com',
  name: 'Wichai',
  roles: ['finance_manager'],
  permissions: [
    'finance:invoice:view',
    'finance:invoice:create',
    'finance:ap:view',
    'finance:ap:approve',
    'finance:reports:view',
    'hr:payroll:approve',
  ],
}

const MOCK_PM_MANAGER: AuthMePayload = {
  id: 'u-pm-manager',
  email: 'napat@alphacorp.com',
  name: 'Napat',
  roles: ['pm_manager'],
  permissions: [
    'pm:budget:view',
    'pm:budget:create',
    'pm:expense:view',
    'pm:expense:create',
    'pm:task:view',
    'pm:task:create',
    'pm:task:edit',
  ],
}

const MOCK_EMPLOYEE: AuthMePayload = {
  id: 'u-employee',
  email: 'pim@alphacorp.com',
  name: 'Pim',
  roles: ['employee'],
  permissions: [
    'hr:leave:view_self',
    'hr:leave:create',
    'pm:task:view_self',
  ],
  mustChangePassword: true,
}

function buildOrgSeed() {
  const departments = [
    mockDepartment({
      id: 'dept-001',
      code: 'ADMIN',
      name: 'ฝ่ายบริหาร',
      parentId: null,
      managerId: 'e-mgr-001',
    }),
    mockDepartment({
      id: 'dept-002',
      code: 'HR',
      name: 'ฝ่ายบุคคล',
      parentId: 'dept-001',
      managerId: 'e-mgr-001',
    }),
    mockDepartment({
      id: 'dept-003',
      code: 'TECH',
      name: 'ฝ่ายไอที',
      parentId: 'dept-001',
      managerId: 'e-mgr-002',
    }),
  ]

  const positions = [
    mockPosition({
      id: 'pos-001',
      code: 'HR001',
      name: 'HR Specialist',
      departmentId: 'dept-002',
      level: 2,
    }),
    mockPosition({
      id: 'pos-002',
      code: 'DEV001',
      name: 'Software Developer',
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
    mockEmployee({
      id: 'e-emp-001',
      code: 'EMP00003',
      firstnameTh: 'พิม',
      lastnameTh: 'จันทร์สิริ',
      status: 'active',
      departmentId: 'dept-003',
      positionId: 'pos-002',
      email: 'pim@alphacorp.com',
    }),
  ]

  return { departments, positions, activeEmployees }
}

async function loginAs(
  page: import('@playwright/test').Page,
  user: AuthMePayload,
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

test.describe('Demo Flow — 8 Acts VC Presentation', () => {
  test.beforeEach(async ({ page, cdpScreencast }) => {
    await cdpScreencast.startCdpScreencast(page)
  })

  test.afterEach(async ({ page, cdpScreencast }) => {
    await cdpScreencast.stopCdpScreencast()
    await page.context().unrouteAll({ behavior: 'ignoreErrors' })
  })

  test('ACT 1 — Settings: Role & User Setup (Somchai - super_admin)', async ({
    page,
  }) => {
    const seed = buildOrgSeed()
    await installHrOrganizationRouter(page, seed)
    await loginAs(page, MOCK_SUPER_ADMIN)

    // Scene 1.1: View Roles
    await page.goto('/settings/roles')
    await page.waitForTimeout(1500)

    // Check role list visible
    const roleItems = page.locator('div[data-role-item]')
    await expect(roleItems).toHaveCount(5)
    await page.waitForTimeout(2000)

    // Click role detail
    await page.locator('button:has-text("View Details")').first().click()
    await page.waitForTimeout(2000)

    const modal = page.getByRole('dialog')
    await expect(modal).toContainText('Permissions')
    await modal.locator('button').last().click()
    await page.waitForTimeout(1500)

    // Scene 1.2: Create User
    await page.goto('/settings/users')
    await page.waitForTimeout(1500)

    const createUserBtn = page.locator('button:has-text("Create User")')
    await createUserBtn.click()
    await page.waitForTimeout(1000)

    const userModal = page.getByRole('dialog')
    await userModal.getByLabel('Email').fill('pim@alphacorp.com')
    await userModal.getByLabel('Password').fill('temp123!')
    await userModal.locator('input[type="checkbox"]').first().click()
    await userModal.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    // Verify success toast
    await expect(page.locator('text=User created successfully')).toBeVisible()
    await page.waitForTimeout(1000)
  })

  test('ACT 2 — HR Organization: Departments & Positions (Malee - hr_admin)', async ({
    page,
  }) => {
    const seed = buildOrgSeed()
    await installHrOrganizationRouter(page, seed)
    await loginAs(page, MOCK_HR_ADMIN)

    // Scene 2.1: Create Department
    await page.goto('/hr/organization')
    await page.waitForTimeout(1500)

    const deptSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: /Department/ }) })
      .first()

    const createDeptBtn = deptSection.locator('button:has-text("Add Department")')
    await createDeptBtn.click()
    await page.waitForTimeout(1000)

    const deptModal = page.getByRole('dialog')
    await deptModal.getByLabel('Department Name').fill('Technology')
    await deptModal.getByLabel('Manager').selectOption('e-mgr-002')
    await deptModal.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    // Verify department appears
    const deptRows = deptSection.locator('div.divide-y').first()
    await expect(deptRows).toContainText('Technology')
    await page.waitForTimeout(1000)

    // Scene 2.2: Create Position
    const posSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: /Position/ }) })
      .first()

    const createPosBtn = posSection.locator('button:has-text("Add Position")')
    await createPosBtn.click()
    await page.waitForTimeout(1000)

    const posModal = page.getByRole('dialog')
    await posModal.getByLabel('Position Name').fill('Software Developer')
    await posModal.getByLabel('Department').selectOption('dept-003')
    await posModal.getByLabel('Level').fill('3')
    await posModal.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    const posRows = posSection.locator('div.divide-y').first()
    await expect(posRows).toContainText('Software Developer')
    await page.waitForTimeout(1000)
  })

  test('ACT 3 — Employee Onboarding + First Login (Malee → Pim)', async ({
    page,
  }) => {
    const seed = buildOrgSeed()
    await installHrOrganizationRouter(page, seed)
    await loginAs(page, MOCK_HR_ADMIN)

    // Scene 3.1: Create Employee
    await page.goto('/hr/employees')
    await page.waitForTimeout(1000)

    const createEmpBtn = page.locator('button:has-text("Add Employee")')
    await createEmpBtn.click()
    await page.waitForTimeout(1000)

    const form = page.locator('form')
    await form.getByLabel('Employee Code').fill('EMP-0042')
    await form.getByLabel('First Name (Thai)').fill('พิม')
    await form.getByLabel('Last Name (Thai)').fill('จันทร์สิริ')
    await form.getByLabel('Email').fill('pim@alphacorp.com')
    await form.getByLabel('Department').selectOption('dept-003')
    await form.getByLabel('Position').selectOption('pos-002')
    await form.getByLabel('Hire Date').fill('2026-04-23')
    await form.getByLabel('Base Salary').fill('45000')
    await form.locator('button:has-text("Save")').click()
    await page.waitForTimeout(3000)

    // Verify employee detail
    const empDetail = page.locator('div[data-employee-detail]')
    await expect(empDetail).toContainText('พิม จันทร์สิริ')
    await page.waitForTimeout(1000)

    // Scene 3.2: First Login + Force Password Change
    await page.context().addCookies([]) // Clear auth
    await clearAuthStorage(page)

    // Update MOCK_EMPLOYEE to not require password change after first setup
    const employeeOnFirstLogin = {
      ...MOCK_EMPLOYEE,
      mustChangePassword: true,
    }

    await loginAs(page, employeeOnFirstLogin)

    // Should redirect to change password
    await expect(page).toHaveURL(/\/change-password/, { timeout: 10_000 })
    await page.waitForTimeout(2000)

    const pwForm = page.locator('form')
    await pwForm.getByLabel('New Password').fill('NewPassword123!')
    await pwForm.getByLabel('Confirm Password').fill('NewPassword123!')
    await pwForm.locator('button:has-text("Change Password")').click()
    await page.waitForTimeout(2000)

    // Should see dashboard
    await expect(page).not.toHaveURL(/\/change-password/, { timeout: 10_000 })
    await page.waitForTimeout(1000)
  })

  test('ACT 4 — Leave Management: Request & Approval (Pim → Malee)', async ({
    page,
  }) => {
    const seed = buildOrgSeed()
    await installHrOrganizationRouter(page, seed)

    // Mock leave endpoints
    await page.route(apiUrlGlob('hr/leaves'), async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: [
            {
              id: 'leave-001',
              employeeId: 'e-emp-001',
              employeeName: 'พิม จันทร์สิริ',
              type: 'annual',
              startDate: '2026-05-01',
              endDate: '2026-05-03',
              days: 3,
              reason: 'ท่องเที่ยวครอบครัว',
              status: 'pending',
              approvedBy: null,
              approvedAt: null,
            },
          ],
          meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
        })
      } else if (route.request().method() === 'POST') {
        await fulfillJson(route, 201, {
          success: true as const,
          data: {
            id: 'leave-001',
            employeeId: 'e-emp-001',
            type: 'annual',
            startDate: '2026-05-01',
            endDate: '2026-05-03',
            days: 3,
            reason: 'ท่องเที่ยวครอบครัว',
            status: 'pending',
          },
        })
      }
    })

    await page.route(apiUrlGlob('hr/leaves/*'), async (route) => {
      const method = route.request().method()
      if (method === 'PATCH') {
        const body = route.request().postDataJSON()
        await fulfillJson(route, 200, {
          success: true as const,
          data: {
            id: 'leave-001',
            status: body.status || 'approved',
          },
        })
      } else {
        await route.continue()
      }
    })

    // Employee submits leave
    await loginAs(page, MOCK_EMPLOYEE)
    await page.goto('/hr/leave')
    await page.waitForTimeout(2000)

    const submitBtn = page.locator('button:has-text("Request Leave")')
    await submitBtn.click()
    await page.waitForTimeout(1000)

    const leaveForm = page.getByRole('dialog')
    await leaveForm.getByLabel('Leave Type').selectOption('annual')
    await leaveForm.getByLabel('Start Date').fill('2026-05-01')
    await leaveForm.getByLabel('End Date').fill('2026-05-03')
    await leaveForm.getByLabel('Reason').fill('ท่องเที่ยวครอบครัว')
    await leaveForm.locator('button:has-text("Submit")').click()
    await page.waitForTimeout(2000)

    // HR approves leave
    await clearAuthStorage(page)
    await loginAs(page, MOCK_HR_ADMIN)
    await page.goto('/hr/leave')
    await page.waitForTimeout(2000)

    const approveBtn = page.locator('button:has-text("Approve")').first()
    await approveBtn.click()
    await page.waitForTimeout(2000)

    // Confirm approval
    const confirmBtn = page.locator('button:has-text("Confirm")').first()
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click()
    }
    await page.waitForTimeout(2000)
  })

  test('ACT 5 — Payroll: Processing & Approval (Malee → Wichai)', async ({
    page,
  }) => {
    const seed = buildOrgSeed()
    await installHrOrganizationRouter(page, seed)

    // Mock payroll endpoints
    await page.route(apiUrlGlob('hr/payroll/runs'), async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: [
            {
              id: 'payrun-001',
              period: 'April 2026',
              payDate: '2026-05-02',
              status: 'draft',
              employeeCount: 3,
              totalGross: 135000,
            },
          ],
          meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
        })
      } else if (route.request().method() === 'POST') {
        await fulfillJson(route, 201, {
          success: true as const,
          data: {
            id: 'payrun-001',
            period: 'April 2026',
            payDate: '2026-05-02',
            status: 'draft',
          },
        })
      }
    })

    await page.route(apiUrlGlob('hr/payroll/runs/*'), async (route) => {
      const method = route.request().method()
      if (method === 'PATCH') {
        const body = route.request().postDataJSON()
        await fulfillJson(route, 200, {
          success: true as const,
          data: {
            id: 'payrun-001',
            status: body.status || 'processed',
          },
        })
      } else if (method === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: {
            id: 'payrun-001',
            period: 'April 2026',
            payDate: '2026-05-02',
            status: 'draft',
            payslips: [
              {
                employeeId: 'e-mgr-001',
                employeeName: 'สมชาย',
                netPay: 45000,
                grossPay: 45000,
                ssDeduction: 0,
                whtDeduction: 0,
              },
            ],
          },
        })
      } else {
        await route.continue()
      }
    })

    await loginAs(page, MOCK_HR_ADMIN)
    await page.goto('/hr/payroll')
    await page.waitForTimeout(1500)

    // Create payroll run
    const createBtn = page.locator('button:has-text("Create Payroll")')
    await createBtn.click()
    await page.waitForTimeout(1000)

    const form = page.getByRole('dialog')
    await form.getByLabel('Period').fill('April 2026')
    await form.getByLabel('Pay Date').fill('2026-05-02')
    await form.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    // Process payroll
    const processBtn = page.locator('button:has-text("Process")')
    if (await processBtn.isVisible()) {
      await processBtn.click()
      await page.waitForTimeout(2000)

      const confirmBtn = page.locator('button:has-text("Confirm")')
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
      }
      await page.waitForTimeout(2000)
    }

    // Approve payroll
    const approveBtn = page.locator('button:has-text("Approve")')
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      await page.waitForTimeout(2000)
    }

    // Finance manager marks as paid
    await clearAuthStorage(page)
    await loginAs(page, MOCK_FINANCE_MANAGER)
    await page.goto('/hr/payroll')
    await page.waitForTimeout(1500)

    const markPaidBtn = page.locator('button:has-text("Mark Paid")')
    if (await markPaidBtn.isVisible()) {
      await markPaidBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('ACT 6 — Finance: Invoice, AP & Reports (Wichai)', async ({ page }) => {
    // Mock finance endpoints
    await page.route(apiUrlGlob('finance/invoices'), async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, 201, {
          success: true as const,
          data: {
            id: 'inv-001',
            invoiceNo: 'INV-2026-0042',
            customerId: 'cust-abc',
            issueDate: '2026-04-23',
            dueDate: '2026-05-23',
            subtotal: 150000,
            vat: 10500,
            total: 160500,
            status: 'draft',
          },
        })
      } else if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: [
            {
              id: 'inv-001',
              invoiceNo: 'INV-2026-0042',
              customerName: 'ABC Co.',
              total: 160500,
              status: 'sent',
              dueDate: '2026-05-23',
            },
          ],
          meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
        })
      }
    })

    await page.route(apiUrlGlob('finance/invoices/*'), async (route) => {
      const method = route.request().method()
      if (method === 'PATCH') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: {
            id: 'inv-001',
            status: 'sent',
          },
        })
      } else {
        await route.continue()
      }
    })

    await page.route(apiUrlGlob('finance/bills'), async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, 201, {
          success: true as const,
          data: {
            id: 'bill-001',
            billNo: 'BILL-2026-0042',
            vendorId: 'vendor-xyz',
            invoiceDate: '2026-04-23',
            dueDate: '2026-05-23',
            total: 25000,
            status: 'draft',
          },
        })
      } else if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: [
            {
              id: 'bill-001',
              billNo: 'BILL-2026-0042',
              vendorName: 'XYZ Supplier Co.',
              total: 25000,
              status: 'approved',
              dueDate: '2026-05-23',
            },
          ],
          meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
        })
      }
    })

    await page.route(apiUrlGlob('finance/reports/*'), async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: {
            totalRevenue: 160500,
            totalExpense: 70000,
            netProfit: 90500,
            arAging: [
              { range: '0-30 days', amount: 160500 },
              { range: '31-60 days', amount: 0 },
            ],
          },
        })
      }
    })

    await loginAs(page, MOCK_FINANCE_MANAGER)

    // Scene 6.1: Create Invoice
    await page.goto('/finance/invoices')
    await page.waitForTimeout(1500)

    const createInvBtn = page.locator('button:has-text("Create Invoice")')
    await createInvBtn.click()
    await page.waitForTimeout(1000)

    const invForm = page.getByRole('dialog')
    await invForm.getByLabel('Customer').selectOption('cust-abc')
    await invForm.getByLabel('Issue Date').fill('2026-04-23')
    await invForm.getByLabel('Due Date').fill('2026-05-23')

    // Add line item
    const addLineBtn = invForm.locator('button:has-text("Add Item")')
    if (await addLineBtn.isVisible()) {
      await addLineBtn.click()
      await invForm.getByLabel('Description').fill('Consulting Service')
      await invForm.getByLabel('Quantity').fill('1')
      await invForm.getByLabel('Price').fill('150000')
    }

    await invForm.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    // Mark as sent
    const sendBtn = page.locator('button:has-text("Mark as Sent")')
    if (await sendBtn.isVisible()) {
      await sendBtn.click()
      await page.waitForTimeout(1500)
    }

    // Scene 6.2: Create AP Bill
    await page.goto('/finance/bills')
    await page.waitForTimeout(1000)

    const createBillBtn = page.locator('button:has-text("Create Bill")')
    await createBillBtn.click()
    await page.waitForTimeout(1000)

    const billForm = page.getByRole('dialog')
    await billForm.getByLabel('Vendor').selectOption('vendor-xyz')
    await billForm.getByLabel('Invoice Date').fill('2026-04-23')
    await billForm.getByLabel('Due Date').fill('2026-05-23')

    const addLineBtn2 = billForm.locator('button:has-text("Add Item")')
    if (await addLineBtn2.isVisible()) {
      await addLineBtn2.click()
      await billForm.getByLabel('Description').fill('Software License')
      await billForm.getByLabel('Quantity').fill('1')
      await billForm.getByLabel('Price').fill('25000')
    }

    await billForm.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    // Submit and approve
    const submitBtn = page.locator('button:has-text("Submit")')
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(1000)
    }

    const approveBtn = page.locator('button:has-text("Approve")')
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      await page.waitForTimeout(2000)
    }

    // Scene 6.3: View Reports
    await page.goto('/finance/reports')
    await page.waitForTimeout(1500)

    const dashboard = page.locator('div[data-finance-dashboard]')
    if (await dashboard.isVisible()) {
      await page.waitForTimeout(3000)
    }

    const arAging = page.locator('button:has-text("AR Aging")')
    if (await arAging.isVisible()) {
      await arAging.click()
      await page.waitForTimeout(2000)
    }

    const exportBtn = page.locator('button:has-text("Export")')
    if (await exportBtn.isVisible()) {
      await exportBtn.click()
      await page.waitForTimeout(1500)
    }
  })

  test('ACT 7 — Project Management: Budget & Tasks (Napat)', async ({
    page,
  }) => {
    // Mock PM endpoints
    await page.route(apiUrlGlob('pm/budgets'), async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, 201, {
          success: true as const,
          data: {
            id: 'budget-001',
            name: 'Digital Transform Q2-2026',
            amount: 500000,
            status: 'draft',
          },
        })
      } else if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: [
            {
              id: 'budget-001',
              name: 'Digital Transform Q2-2026',
              amount: 500000,
              spent: 2500,
              status: 'active',
            },
          ],
          meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
        })
      }
    })

    await page.route(apiUrlGlob('pm/budgets/*'), async (route) => {
      if (route.request().method() === 'PATCH') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: {
            id: 'budget-001',
            status: 'active',
          },
        })
      } else {
        await route.continue()
      }
    })

    await page.route(apiUrlGlob('pm/expenses'), async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, 201, {
          success: true as const,
          data: {
            id: 'exp-001',
            budgetId: 'budget-001',
            title: 'ค่าเดินทาง Meeting',
            amount: 2500,
            status: 'pending',
          },
        })
      } else if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: [
            {
              id: 'exp-001',
              title: 'ค่าเดินทาง Meeting',
              amount: 2500,
              status: 'approved',
            },
          ],
          meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
        })
      }
    })

    await page.route(apiUrlGlob('pm/tasks'), async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, 201, {
          success: true as const,
          data: {
            id: 'task-001',
            title: 'Design UI Components',
            status: 'todo',
            priority: 'high',
          },
        })
      } else if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: [
            {
              id: 'task-001',
              title: 'Design UI Components',
              status: 'in_progress',
              priority: 'high',
            },
          ],
          meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
        })
      }
    })

    await page.route(apiUrlGlob('pm/tasks/*'), async (route) => {
      if (route.request().method() === 'PATCH') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: {
            id: 'task-001',
            status: 'in_progress',
          },
        })
      } else {
        await route.continue()
      }
    })

    await loginAs(page, MOCK_PM_MANAGER)

    // Scene 7.1: Create Budget
    await page.goto('/pm/budgets')
    await page.waitForTimeout(1000)

    const createBudgetBtn = page.locator('button:has-text("Create")')
    await createBudgetBtn.click()
    await page.waitForTimeout(1000)

    const budgetForm = page.getByRole('dialog')
    await budgetForm.getByLabel('Budget Name').fill('Digital Transform Q2-2026')
    await budgetForm.getByLabel('Amount').fill('500000')
    await budgetForm.getByLabel('Start Date').fill('2026-04-01')
    await budgetForm.getByLabel('End Date').fill('2026-06-30')
    await budgetForm.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    // Activate budget
    const activateBtn = page.locator('button:has-text("Activate")')
    if (await activateBtn.isVisible()) {
      await activateBtn.click()
      await page.waitForTimeout(2000)
    }

    // Scene 7.2: Create Expense
    await page.goto('/pm/expenses')
    await page.waitForTimeout(1000)

    const createExpBtn = page.locator('button:has-text("Create Expense")')
    await createExpBtn.click()
    await page.waitForTimeout(1000)

    const expForm = page.getByRole('dialog')
    await expForm.getByLabel('Budget').selectOption('budget-001')
    await expForm.getByLabel('Title').fill('ค่าเดินทาง Meeting')
    await expForm.getByLabel('Amount').fill('2500')
    await expForm.getByLabel('Date').fill('2026-04-23')

    const uploadInput = expForm.locator('input[type="file"]')
    if (await uploadInput.isVisible()) {
      // File upload would happen here if needed
    }

    await expForm.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    // Submit expense
    const submitExpBtn = page.locator('button:has-text("Submit")')
    if (await submitExpBtn.isVisible()) {
      await submitExpBtn.click()
      await page.waitForTimeout(1000)
    }

    // Scene 7.3: Create Task
    await page.goto('/pm/tasks')
    await page.waitForTimeout(1000)

    const createTaskBtn = page.locator('button:has-text("Create Task")')
    await createTaskBtn.click()
    await page.waitForTimeout(1000)

    const taskForm = page.getByRole('dialog')
    await taskForm.getByLabel('Task Title').fill('Design UI Components')
    await taskForm.getByLabel('Assignee').selectOption('e-emp-001')
    await taskForm.getByLabel('Priority').selectOption('high')
    await taskForm.getByLabel('Due Date').fill('2026-05-30')
    await taskForm.locator('button:has-text("Save")').click()
    await page.waitForTimeout(2000)

    // Change task status
    const statusBtn = page.locator('button:has-text("In Progress")')
    if (await statusBtn.isVisible()) {
      await statusBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('ACT 8 — Dashboard: Executive Overview (Napat)', async ({ page }) => {
    // Mock dashboard endpoints
    await page.route(apiUrlGlob('pm/dashboard'), async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, 200, {
          success: true as const,
          data: {
            totalBudget: 500000,
            totalSpent: 2500,
            budgetUtilization: 0.5,
            taskStats: {
              total: 1,
              todo: 0,
              inProgress: 1,
              done: 0,
            },
            budgets: [
              {
                name: 'Digital Transform Q2-2026',
                budget: 500000,
                spent: 2500,
                utilization: 0.5,
              },
            ],
          },
        })
      }
    })

    await loginAs(page, MOCK_PM_MANAGER)

    // View Dashboard
    await page.goto('/pm/dashboard')
    await page.waitForTimeout(1000)

    // KPI cards
    const kpiCards = page.locator('div[data-kpi-card]')
    if (await kpiCards.count()) {
      await expect(kpiCards).toHaveCount(3)
      await page.waitForTimeout(3000)
    }

    // Budget utilization chart
    const budgetChart = page.locator('canvas, [data-budget-chart]')
    if (await budgetChart.isVisible()) {
      await page.waitForTimeout(2000)
    }

    // Task status chart
    const taskChart = page.locator('canvas, [data-task-chart]')
    if (await taskChart.isVisible()) {
      await page.waitForTimeout(2000)
    }

    // Export
    const exportBtn = page.locator('button:has-text("Export")')
    if (await exportBtn.isVisible()) {
      await exportBtn.click()
      await page.waitForTimeout(1500)
    }
  })
})
