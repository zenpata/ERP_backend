import type { Page, Route } from '@playwright/test'
import { apiUrlGlob, fulfillJson, ok } from './auth-api-mock'
import { listMeta, mockEmployee, type MockEmployeeRow } from './hr-fixtures'

const iso = '2026-01-01T00:00:00.000Z'

export type MockDepartmentRow = {
  id: string
  code: string
  name: string
  description?: string | null
  parentId?: string | null
  managerId?: string | null
  createdAt: string
  updatedAt: string
}

export type MockDepartmentDetail = MockDepartmentRow & {
  parentName: string | null
  managerName: string | null
  childrenCount: number
  positionsCount: number
}

export type MockPositionRow = {
  id: string
  code: string
  name: string
  departmentId?: string | null
  level: number
  createdAt: string
  updatedAt: string
  departmentName?: string | null
}

export type MockPositionDetail = MockPositionRow & {
  employeeCount: number
}

export function mockDepartment(overrides: Partial<MockDepartmentRow> = {}): MockDepartmentRow {
  return {
    id: 'dept-001',
    code: 'D001',
    name: 'ฝ่ายบุคคล',
    description: 'แผนกตัวอย่าง',
    parentId: null,
    managerId: 'e-mgr-001',
    createdAt: iso,
    updatedAt: iso,
    ...overrides,
  }
}

export function mockPosition(overrides: Partial<MockPositionRow> = {}): MockPositionRow {
  return {
    id: 'pos-001',
    code: 'P001',
    name: 'HR Specialist',
    departmentId: 'dept-001',
    level: 3,
    createdAt: iso,
    updatedAt: iso,
    departmentName: 'ฝ่ายบุคคล',
    ...overrides,
  }
}

type DepartmentCreateBody = {
  name?: unknown
  description?: unknown
  parentId?: unknown
  managerId?: unknown
}

type DepartmentUpdateBody = DepartmentCreateBody

type PositionCreateBody = {
  name?: unknown
  departmentId?: unknown
  level?: unknown
}

type PositionUpdateBody = PositionCreateBody

type OrgListEndpoint = 'employees' | 'departments' | 'positions'

type QueryViolation = {
  endpoint: OrgListEndpoint
  url: string
  query: Record<string, string>
  message: string
  fields: Record<string, string>
}

const EMPLOYEE_STATUSES = new Set(['active', 'resigned', 'terminated', 'inactive'])

function toStr(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function toInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

function parseBody<T extends Record<string, unknown>>(route: Route): T {
  try {
    return route.request().postDataJSON() as T
  } catch {
    return {} as T
  }
}

function parsePageAndPerPage(url: string): { page: number; perPage: number } {
  const sp = new URL(url).searchParams
  const pageRaw = Number.parseInt(sp.get('page') ?? '1', 10)
  const perPageRaw = Number.parseInt(sp.get('perPage') ?? '20', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const perPage = Number.isFinite(perPageRaw) && perPageRaw > 0 ? perPageRaw : 20
  return { page, perPage }
}

function queryToRecord(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of sp.entries()) out[k] = v
  return out
}

function validatePositiveInt(raw: string | null): number | null {
  if (raw == null) return null
  if (!/^[0-9]+$/.test(raw)) return Number.NaN
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < 1) return Number.NaN
  return parsed
}

function validateListQuery(
  endpoint: OrgListEndpoint,
  url: string,
  maxPerPage: number,
): { ok: true } | { ok: false; violation: QueryViolation } {
  const sp = new URL(url).searchParams
  const fields: Record<string, string> = {}

  const page = validatePositiveInt(sp.get('page'))
  if (Number.isNaN(page)) fields.page = 'page must be a positive integer'

  const perPage = validatePositiveInt(sp.get('perPage'))
  if (Number.isNaN(perPage)) fields.perPage = 'perPage must be a positive integer'
  else if (perPage != null && perPage > maxPerPage) {
    fields.perPage = `perPage must be less than or equal to ${maxPerPage}`
  }

  if (endpoint === 'employees') {
    const status = sp.get('status')
    if (status != null && status !== '' && !EMPLOYEE_STATUSES.has(status)) {
      fields.status = 'status must be one of active,resigned,terminated,inactive'
    }
  }

  if (Object.keys(fields).length === 0) return { ok: true }

  return {
    ok: false,
    violation: {
      endpoint,
      url,
      query: queryToRecord(sp),
      message: 'Validation failed',
      fields,
    },
  }
}

function paginate<T>(rows: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage
  const end = start + perPage
  return rows.slice(start, end)
}

function tailPath(pathname: string, prefix: string): string {
  if (!pathname.startsWith(prefix)) return ''
  return pathname.slice(prefix.length)
}

export type HrOrganizationRouterConfig = {
  departments: MockDepartmentRow[]
  positions: MockPositionRow[]
  activeEmployees?: MockEmployeeRow[]
  departmentDetailLookup?: (id: string) => MockDepartmentDetail | MockDepartmentRow | null
  positionDetailLookup?: (id: string) => MockPositionDetail | MockPositionRow | null
  postDepartment?: (route: Route, body: DepartmentCreateBody) => Promise<void>
  patchDepartment?: (route: Route, id: string, body: DepartmentUpdateBody) => Promise<void>
  deleteDepartment?: (route: Route, id: string) => Promise<void>
  postPosition?: (route: Route, body: PositionCreateBody) => Promise<void>
  patchPosition?: (route: Route, id: string, body: PositionUpdateBody) => Promise<void>
  deletePosition?: (route: Route, id: string) => Promise<void>
  strictQueryValidation?: boolean
  maxPerPage?: number
  onQueryViolation?: (violation: QueryViolation) => void
}

export async function installHrOrganizationRouter(page: Page, cfg: HrOrganizationRouterConfig) {
  const departments = [...cfg.departments]
  const positions = [...cfg.positions]
  const activeEmployees =
    cfg.activeEmployees ??
    [
      mockEmployee({
        id: 'e-mgr-001',
        code: 'EMP00001',
        firstnameTh: 'สมชาย',
        lastnameTh: 'หัวหน้าทีม',
        status: 'active',
        departmentId: 'dept-001',
        positionId: 'pos-001',
      }),
    ]
  const strictQueryValidation = cfg.strictQueryValidation ?? true
  const maxPerPage = cfg.maxPerPage ?? 100

  const managerNameById = () => {
    const map = new Map<string, string>()
    for (const e of activeEmployees) {
      map.set(e.id, `${e.firstnameTh} ${e.lastnameTh}`)
    }
    return map
  }

  const deptNameById = () => {
    const map = new Map<string, string>()
    for (const d of departments) {
      map.set(d.id, d.name)
    }
    return map
  }

  const defaultDepartmentDetail = (id: string): MockDepartmentDetail | null => {
    const row = departments.find((d) => d.id === id)
    if (!row) return null
    const mgrMap = managerNameById()
    const deptMap = deptNameById()
    return {
      ...row,
      parentName: row.parentId ? (deptMap.get(row.parentId) ?? null) : null,
      managerName: row.managerId ? (mgrMap.get(row.managerId) ?? null) : null,
      childrenCount: departments.filter((d) => d.parentId === row.id).length,
      positionsCount: positions.filter((p) => p.departmentId === row.id).length,
    }
  }

  const defaultPositionDetail = (id: string): MockPositionDetail | null => {
    const row = positions.find((p) => p.id === id)
    if (!row) return null
    const deptMap = deptNameById()
    return {
      ...row,
      departmentName: row.departmentId ? (deptMap.get(row.departmentId) ?? null) : null,
      employeeCount: activeEmployees.filter(
        (e) => e.status === 'active' && e.positionId === row.id,
      ).length,
    }
  }

  await page.route(apiUrlGlob('hr/employees'), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    const url = route.request().url()
    const pathname = new URL(url).pathname
    const tail = tailPath(pathname, '/api/hr/employees')
    if (tail !== '') {
      await route.continue()
      return
    }
    if (strictQueryValidation) {
      const validation = validateListQuery('employees', url, maxPerPage)
      if (!validation.ok) {
        cfg.onQueryViolation?.(validation.violation)
        await fulfillJson(route, 422, {
          success: false,
          message: validation.violation.message,
          statusCode: 422,
          error: { fields: validation.violation.fields },
        })
        return
      }
    }

    const sp = new URL(url).searchParams
    const status = toStr(sp.get('status'))
    const search = toStr(sp.get('search')).trim()
    const { page: pageNum, perPage } = parsePageAndPerPage(url)
    let rows = [...activeEmployees]

    if (status) rows = rows.filter((e) => e.status === status)
    if (search) {
      rows = rows.filter(
        (e) =>
          `${e.firstnameTh}${e.lastnameTh}`.includes(search) ||
          e.code.includes(search) ||
          (e.email ?? '').includes(search),
      )
    }

    const data = paginate(rows, pageNum, perPage)
    await fulfillJson(route, 200, {
      success: true as const,
      data,
      meta: listMeta(rows.length, pageNum, perPage),
    })
  })

  await page.route(apiUrlGlob('hr/departments'), async (route) => {
    const req = route.request()
    const method = req.method()
    const url = req.url()
    const pathname = new URL(url).pathname
    const tail = tailPath(pathname, '/api/hr/departments')

    if (method === 'GET' && tail === '') {
      if (strictQueryValidation) {
        const validation = validateListQuery('departments', url, maxPerPage)
        if (!validation.ok) {
          cfg.onQueryViolation?.(validation.violation)
          await fulfillJson(route, 422, {
            success: false,
            message: validation.violation.message,
            statusCode: 422,
            error: { fields: validation.violation.fields },
          })
          return
        }
      }
      const sp = new URL(url).searchParams
      const search = toStr(sp.get('search')).trim()
      const parentId = toStr(sp.get('parentId'))
      const { page: pageNum, perPage } = parsePageAndPerPage(url)

      let rows = [...departments]
      if (search) {
        rows = rows.filter((d) => d.name.includes(search) || d.code.includes(search))
      }
      if (parentId) {
        rows = rows.filter((d) => (d.parentId ?? '') === parentId)
      }

      const data = paginate(rows, pageNum, perPage)
      await fulfillJson(route, 200, {
        success: true as const,
        data,
        meta: listMeta(rows.length, pageNum, perPage),
      })
      return
    }

    if (method === 'GET' && tail.startsWith('/')) {
      const id = tail.slice(1)
      const detail = cfg.departmentDetailLookup
        ? cfg.departmentDetailLookup(id)
        : defaultDepartmentDetail(id)
      if (!detail) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      if ('childrenCount' in detail && 'positionsCount' in detail) {
        await fulfillJson(route, 200, ok(detail))
      } else {
        const fallback = defaultDepartmentDetail(id)
        if (!fallback) {
          await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
          return
        }
        await fulfillJson(route, 200, ok(fallback))
      }
      return
    }

    if (method === 'POST' && tail === '') {
      const body = parseBody<DepartmentCreateBody>(route)
      if (cfg.postDepartment) {
        await cfg.postDepartment(route, body)
        return
      }
      const next = String(departments.length + 1).padStart(3, '0')
      const created: MockDepartmentRow = {
        id: `dept-${next}`,
        code: `D${next}`,
        name: toStr(body.name) || 'แผนกใหม่',
        description: toStr(body.description) || null,
        parentId: toStr(body.parentId) || null,
        managerId: toStr(body.managerId) || null,
        createdAt: iso,
        updatedAt: iso,
      }
      departments.push(created)
      await fulfillJson(route, 201, ok(created))
      return
    }

    if (method === 'PATCH' && tail.startsWith('/')) {
      const id = tail.slice(1)
      const body = parseBody<DepartmentUpdateBody>(route)
      if (cfg.patchDepartment) {
        await cfg.patchDepartment(route, id, body)
        return
      }
      const idx = departments.findIndex((d) => d.id === id)
      if (idx < 0) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      const base = departments[idx]
      const updated: MockDepartmentRow = {
        ...base,
        name: toStr(body.name) || base.name,
        description:
          body.description === null ? null : toStr(body.description) || (base.description ?? null),
        parentId: body.parentId === null ? null : toStr(body.parentId) || (base.parentId ?? null),
        managerId:
          body.managerId === null ? null : toStr(body.managerId) || (base.managerId ?? null),
        updatedAt: iso,
      }
      departments[idx] = updated
      await fulfillJson(route, 200, ok(updated))
      return
    }

    if (method === 'DELETE' && tail.startsWith('/')) {
      const id = tail.slice(1)
      if (cfg.deleteDepartment) {
        await cfg.deleteDepartment(route, id)
        return
      }
      const idx = departments.findIndex((d) => d.id === id)
      if (idx < 0) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      departments.splice(idx, 1)
      await fulfillJson(route, 200, ok(null))
      return
    }

    await route.continue()
  })

  await page.route(apiUrlGlob('hr/positions'), async (route) => {
    const req = route.request()
    const method = req.method()
    const url = req.url()
    const pathname = new URL(url).pathname
    const tail = tailPath(pathname, '/api/hr/positions')

    if (method === 'GET' && tail === '') {
      if (strictQueryValidation) {
        const validation = validateListQuery('positions', url, maxPerPage)
        if (!validation.ok) {
          cfg.onQueryViolation?.(validation.violation)
          await fulfillJson(route, 422, {
            success: false,
            message: validation.violation.message,
            statusCode: 422,
            error: { fields: validation.violation.fields },
          })
          return
        }
      }
      const sp = new URL(url).searchParams
      const search = toStr(sp.get('search')).trim()
      const departmentId = toStr(sp.get('departmentId'))
      const { page: pageNum, perPage } = parsePageAndPerPage(url)

      const deptMap = deptNameById()
      let rows = positions.map((p) => ({
        ...p,
        departmentName: p.departmentId ? (deptMap.get(p.departmentId) ?? null) : null,
      }))
      if (search) rows = rows.filter((p) => p.name.includes(search) || p.code.includes(search))
      if (departmentId) rows = rows.filter((p) => (p.departmentId ?? '') === departmentId)

      const data = paginate(rows, pageNum, perPage)
      await fulfillJson(route, 200, {
        success: true as const,
        data,
        meta: listMeta(rows.length, pageNum, perPage),
      })
      return
    }

    if (method === 'GET' && tail.startsWith('/')) {
      const id = tail.slice(1)
      const detail = cfg.positionDetailLookup ? cfg.positionDetailLookup(id) : defaultPositionDetail(id)
      if (!detail) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      if ('employeeCount' in detail) {
        await fulfillJson(route, 200, ok(detail))
      } else {
        const fallback = defaultPositionDetail(id)
        if (!fallback) {
          await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
          return
        }
        await fulfillJson(route, 200, ok(fallback))
      }
      return
    }

    if (method === 'POST' && tail === '') {
      const body = parseBody<PositionCreateBody>(route)
      if (cfg.postPosition) {
        await cfg.postPosition(route, body)
        return
      }
      const next = String(positions.length + 1).padStart(3, '0')
      const created: MockPositionRow = {
        id: `pos-${next}`,
        code: `P${next}`,
        name: toStr(body.name) || 'ตำแหน่งใหม่',
        departmentId: toStr(body.departmentId) || null,
        level: toInt(body.level) ?? 0,
        createdAt: iso,
        updatedAt: iso,
      }
      positions.push(created)
      await fulfillJson(route, 201, ok(created))
      return
    }

    if (method === 'PATCH' && tail.startsWith('/')) {
      const id = tail.slice(1)
      const body = parseBody<PositionUpdateBody>(route)
      if (cfg.patchPosition) {
        await cfg.patchPosition(route, id, body)
        return
      }
      const idx = positions.findIndex((p) => p.id === id)
      if (idx < 0) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      const base = positions[idx]
      const parsedLevel = toInt(body.level)
      const updated: MockPositionRow = {
        ...base,
        name: toStr(body.name) || base.name,
        departmentId:
          body.departmentId === null ? null : toStr(body.departmentId) || (base.departmentId ?? null),
        level: parsedLevel ?? base.level,
        updatedAt: iso,
      }
      positions[idx] = updated
      await fulfillJson(route, 200, ok(updated))
      return
    }

    if (method === 'DELETE' && tail.startsWith('/')) {
      const id = tail.slice(1)
      if (cfg.deletePosition) {
        await cfg.deletePosition(route, id)
        return
      }
      const idx = positions.findIndex((p) => p.id === id)
      if (idx < 0) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      positions.splice(idx, 1)
      await fulfillJson(route, 200, ok(null))
      return
    }

    await route.continue()
  })
}
