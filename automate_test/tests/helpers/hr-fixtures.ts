import type { Page, Route } from '@playwright/test'
import { apiUrlGlob, fulfillJson, ok } from './auth-api-mock'

/** Valid UUID v4 for selects / FK fields */
export const MOCK_DEPT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const MOCK_POS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const iso = '2026-01-01T00:00:00.000Z'

export type MockEmployeeRow = {
  id: string
  code: string
  nationalId: string
  firstnameTh: string
  lastnameTh: string
  firstnameEn?: string | null
  lastnameEn?: string | null
  nickname?: string | null
  birthDate: string
  gender: 'male' | 'female' | 'other'
  phone?: string | null
  email?: string | null
  avatarUrl?: string | null
  address?: string | null
  departmentId?: string | null
  positionId?: string | null
  managerId?: string | null
  employmentType: 'monthly' | 'daily' | 'contract'
  status: 'active' | 'inactive' | 'resigned' | 'terminated'
  startDate: string
  endDate?: string | null
  baseSalary: string
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountName?: string | null
  ssEnrolled: boolean
  userId?: string | null
  createdAt: string
  updatedAt: string
}

export function mockEmployee(overrides: Partial<MockEmployeeRow> = {}): MockEmployeeRow {
  return {
    id: 'e-001',
    code: 'EMP00001',
    nationalId: '1100700123456',
    firstnameTh: 'สมชาย',
    lastnameTh: 'ใจดี',
    birthDate: '1992-05-10',
    gender: 'male',
    employmentType: 'monthly',
    status: 'active',
    startDate: '2024-01-01',
    baseSalary: '45000',
    ssEnrolled: true,
    departmentId: MOCK_DEPT_ID,
    positionId: MOCK_POS_ID,
    email: 'somchai@example.com',
    createdAt: iso,
    updatedAt: iso,
    ...overrides,
  }
}

export function listMeta(total: number, page = 1, perPage = 20) {
  return {
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function installHrDepartmentsAndPositions(page: Page) {
  await page.route(apiUrlGlob('hr/departments'), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await fulfillJson(route, 200, {
      success: true as const,
      data: [
        {
          id: MOCK_DEPT_ID,
          code: 'D01',
          name: 'แผนกทดสอบ',
          description: null,
          parentId: null,
          managerId: null,
          createdAt: iso,
          updatedAt: iso,
        },
      ],
      meta: listMeta(1, 1, 500),
    })
  })

  await page.route(apiUrlGlob('hr/positions'), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await fulfillJson(route, 200, {
      success: true as const,
      data: [
        {
          id: MOCK_POS_ID,
          code: 'P01',
          name: 'ตำแหน่งทดสอบ',
          departmentId: MOCK_DEPT_ID,
          level: 1,
          createdAt: iso,
          updatedAt: iso,
          departmentName: 'แผนกทดสอบ',
        },
      ],
      meta: listMeta(1, 1, 500),
    })
  })
}

function employeesTail(pathname: string): string {
  const prefix = '/api/hr/employees'
  if (!pathname.startsWith(prefix)) return ''
  return pathname.slice(prefix.length)
}

export type HrEmployeesRouterConfig = {
  list: MockEmployeeRow[]
  /** GET /hr/employees/me — 404 when not linked to an employee */
  meNotLinked?: boolean
  meProfile?: MockEmployeeRow
  /** Override detail GET for arbitrary ids (e.g. invalid-id → 404) */
  detailLookup?: (id: string) => MockEmployeeRow | null
  postCreate?: (route: Route, body: Record<string, unknown>) => Promise<void>
  patchUpdate?: (route: Route, id: string, body: Record<string, unknown>) => Promise<void>
  deleteTerminate?: (route: Route, id: string) => Promise<void>
}

export async function installHrEmployeesRouter(page: Page, cfg: HrEmployeesRouterConfig) {
  const byId = new Map(cfg.list.map((e) => [e.id, e]))

  const resolveDetail = (id: string): MockEmployeeRow | null => {
    if (cfg.detailLookup) return cfg.detailLookup(id)
    return byId.get(id) ?? null
  }

  await page.route(apiUrlGlob('hr/employees'), async (route) => {
    const req = route.request()
    const method = req.method()
    let pathname: string
    try {
      pathname = new URL(req.url()).pathname
    } catch {
      await route.continue()
      return
    }
    const tail = employeesTail(pathname)

    if (method === 'GET' && tail === '/me') {
      if (cfg.meNotLinked) {
        await fulfillJson(route, 404, {
          success: false,
          message: 'ไม่พบข้อมูลพนักงาน',
          statusCode: 404,
        })
        return
      }
      await fulfillJson(route, 200, ok(cfg.meProfile ?? mockEmployee({ id: 'e-self', userId: 'u-emp' })))
      return
    }

    if (method === 'GET' && tail === '') {
      const sp = new URL(req.url()).searchParams
      const q = (sp.get('search') ?? '').trim()
      const st = sp.get('status')
      let data = cfg.list
      if (q) {
        data = data.filter(
          (e) =>
            `${e.firstnameTh}${e.lastnameTh}`.includes(q) ||
            e.code.includes(q) ||
            (e.email ?? '').includes(q),
        )
      }
      if (st) {
        data = data.filter((e) => e.status === st)
      }
      await fulfillJson(route, 200, {
        success: true as const,
        data,
        meta: listMeta(data.length),
      })
      return
    }

    if (method === 'GET' && tail.startsWith('/')) {
      const id = tail.slice(1)
      const row = resolveDetail(id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      await fulfillJson(route, 200, ok(row))
      return
    }

    if (method === 'POST' && tail === '' && cfg.postCreate) {
      let body: Record<string, unknown> = {}
      try {
        body = req.postDataJSON() as Record<string, unknown>
      } catch {
        body = {}
      }
      await cfg.postCreate(route, body)
      return
    }

    if (method === 'PATCH' && tail.startsWith('/') && cfg.patchUpdate) {
      const id = tail.slice(1)
      let body: Record<string, unknown> = {}
      try {
        body = req.postDataJSON() as Record<string, unknown>
      } catch {
        body = {}
      }
      await cfg.patchUpdate(route, id, body)
      return
    }

    if (method === 'DELETE' && tail.startsWith('/') && cfg.deleteTerminate) {
      const id = tail.slice(1)
      await cfg.deleteTerminate(route, id)
      return
    }

    await route.continue()
  })
}
