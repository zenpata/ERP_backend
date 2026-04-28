import type { Page } from '@playwright/test'
import { apiUrlGlob, fulfillJson } from '../auth-api-mock'
import { makeLocalId, type MockErpState } from '../realistic-data'
import { containsText, getApiPath, listJson, listPagingFromUrl, okJson, parseBody } from './common'

export async function installHrMockRouter(page: Page, state: MockErpState) {
  const attendanceRows: Array<{
    id: string
    employeeId: string
    employeeCode: string
    firstnameTh: string
    lastnameTh: string
    date: string
    clockIn: string | null
    clockOut: string | null
    workMinutes: number | null
    overtimeMinutes: number
    breakMinutes: number
    lateMinutes: number | null
    status: string
    clockMethod: string | null
  }> = []

  const workSchedules = [
    {
      id: 'ws-001',
      name: 'Office hours',
      startTime: '09:00:00',
      endTime: '18:00:00',
      breakDurationMinutes: 60,
      lateToleranceMinutes: 15,
      clockMode: 'gps',
      workDays: [1, 2, 3, 4, 5],
      isActive: true,
      createdAt: state.nowIso,
    },
  ]

  const holidays: Array<{ id: string; date: string; name: string; type: string; year: number; createdAt: string }> = [
    { id: 'holiday-001', date: '2026-01-01', name: 'New Year', type: 'public', year: 2026, createdAt: state.nowIso },
  ]

  const overtimeRows: Array<{
    id: string
    employeeId: string
    date: string
    requestedHours: string
    reason: string | null
    status: string
    approvedBy: string | null
    approvedAt: string | null
    rejectedAt: string | null
    rejectionReason: string | null
    createdAt: string
    employeeCode: string
  }> = [
    {
      id: 'ot-001',
      employeeId: 'emp-001',
      date: '2026-04-20',
      requestedHours: '2',
      reason: 'Deploy release',
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      createdAt: state.nowIso,
      employeeCode: 'EMP-0001',
    },
  ]

  await page.route(apiUrlGlob('hr/**'), async (route) => {
    const req = route.request()
    const method = req.method()
    const url = req.url()
    const path = getApiPath(url)
    const sp = new URL(url).searchParams

    // Leave
    if (method === 'GET' && path === '/hr/leaves/types') {
      await okJson(route, state.leaveTypes)
      return
    }
    if (method === 'GET' && path === '/hr/leaves') {
      const status = sp.get('status') ?? ''
      const q = (sp.get('search') ?? '').trim()
      const rows = state.leaves.filter((x) => {
        if (status && x.status !== status) return false
        if (q) {
          const fullName = `${x.employeeFirstname} ${x.employeeLastname}`
          if (!containsText(fullName, q) && !containsText(x.employeeCode, q)) return false
        }
        return true
      })
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/hr/leaves') {
      const body = parseBody<{
        leaveTypeId?: string
        startDate?: string
        endDate?: string
        reason?: string
      }>(route)

      if (!body.leaveTypeId || !body.startDate || !body.endDate) {
        await fulfillJson(route, 422, {
          success: false,
          message: 'Required fields missing',
          statusCode: 422,
        })
        return
      }
      if (body.endDate < body.startDate) {
        await fulfillJson(route, 422, {
          success: false,
          message: 'endDate must be after startDate',
          statusCode: 422,
        })
        return
      }

      const leaveType = state.leaveTypes.find((x) => x.id === body.leaveTypeId)
      const created = {
        id: makeLocalId('leave', state.leaves),
        employeeId: 'emp-001',
        employeeCode: 'EMP-0001',
        employeeFirstname: 'สมหญิง',
        employeeLastname: 'รักดี',
        leaveTypeId: body.leaveTypeId,
        leaveTypeCode: leaveType?.code ?? 'annual',
        leaveTypeName: leaveType?.name ?? 'ลาพักร้อน',
        startDate: body.startDate,
        endDate: body.endDate,
        daysCount: '1',
        status: 'pending' as const,
        reason: body.reason ?? null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      }
      state.leaves.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'PATCH' && path.match(/^\/hr\/leaves\/[^/]+\/approve$/)) {
      const id = path.split('/')[3]
      const row = state.leaves.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      row.status = 'approved'
      await okJson(route, { id: row.id, status: row.status })
      return
    }
    if (method === 'PATCH' && path.match(/^\/hr\/leaves\/[^/]+\/reject$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ rejectionReason?: string }>(route)
      if (!body.rejectionReason?.trim()) {
        await fulfillJson(route, 422, {
          success: false,
          message: 'rejectionReason required',
          statusCode: 422,
        })
        return
      }
      const row = state.leaves.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      row.status = 'rejected'
      row.rejectionReason = body.rejectionReason
      await okJson(route, { id: row.id, status: row.status, rejectionReason: row.rejectionReason })
      return
    }

    // Payroll
    if (method === 'GET' && path === '/hr/payroll') {
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, state.payrollRecords, pageNo, perPage)
      return
    }
    if (method === 'GET' && path === '/hr/payroll/runs') {
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, state.payrollRuns, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/hr/payroll/runs') {
      const body = parseBody<{ periodMonth?: number; periodYear?: number }>(route)
      if (!body.periodMonth || !body.periodYear) {
        await fulfillJson(route, 422, { success: false, message: 'periodMonth and periodYear required', statusCode: 422 })
        return
      }
      const created = {
        id: `run-${body.periodYear}-${String(body.periodMonth).padStart(2, '0')}`,
        periodMonth: body.periodMonth,
        periodYear: body.periodYear,
        status: 'draft' as const,
        totalGross: '0',
        totalDeductions: '0',
        totalNet: '0',
        processedAt: null,
        approvedBy: null,
        approvedAt: null,
        paidAt: null,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payslipCount: 0,
      }
      state.payrollRuns.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'POST' && path.match(/^\/hr\/payroll\/runs\/[^/]+\/process$/)) {
      const id = path.split('/')[4]
      const row = state.payrollRuns.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      row.status = 'processing'
      row.processedAt = new Date().toISOString()
      await okJson(route, { id, status: row.status })
      return
    }
    if (method === 'POST' && path.match(/^\/hr\/payroll\/runs\/[^/]+\/approve$/)) {
      const id = path.split('/')[4]
      const row = state.payrollRuns.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      row.status = 'approved'
      row.approvedAt = new Date().toISOString()
      await okJson(route, { id, status: row.status })
      return
    }
    if (method === 'POST' && path.match(/^\/hr\/payroll\/runs\/[^/]+\/mark-paid$/)) {
      const id = path.split('/')[4]
      const row = state.payrollRuns.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      row.status = 'paid'
      row.paidAt = new Date().toISOString()
      await okJson(route, { id, status: row.status })
      return
    }
    if (method === 'GET' && path.match(/^\/hr\/payroll\/runs\/[^/]+\/payslips$/)) {
      await okJson(route, state.payrollRecords)
      return
    }

    // Attendance / OT / Holidays
    if (method === 'GET' && path === '/hr/attendance') {
      const dateFrom = sp.get('dateFrom')
      const dateTo = sp.get('dateTo')
      const rows = attendanceRows.filter((row) => {
        if (dateFrom && row.date < dateFrom) return false
        if (dateTo && row.date > dateTo) return false
        return true
      })
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'GET' && path === '/hr/attendance/summary') {
      const totals = attendanceRows.reduce(
        (acc, row) => {
          acc.recordDays += 1
          acc.totalWorkMinutes += row.workMinutes ?? 0
          acc.totalOvertimeMinutes += row.overtimeMinutes
          return acc
        },
        { recordDays: 0, totalWorkMinutes: 0, totalOvertimeMinutes: 0 },
      )
      await okJson(route, { totals })
      return
    }
    if (method === 'POST' && path === '/hr/attendance/check-in') {
      const date = new Date().toISOString().slice(0, 10)
      const existing = attendanceRows.find((x) => x.date === date && x.employeeCode === 'EMP-0001' && !x.clockOut)
      if (existing) {
        await fulfillJson(route, 409, { success: false, message: 'Already checked in', statusCode: 409 })
        return
      }
      const created = {
        id: makeLocalId('att', attendanceRows),
        employeeId: 'emp-001',
        employeeCode: 'EMP-0001',
        firstnameTh: 'สมหญิง',
        lastnameTh: 'รักดี',
        date,
        clockIn: `${date}T09:00:00.000Z`,
        clockOut: null,
        workMinutes: null,
        overtimeMinutes: 0,
        breakMinutes: 60,
        lateMinutes: 0,
        status: 'present',
        clockMethod: 'web',
      }
      attendanceRows.unshift(created)
      await okJson(route, { id: created.id }, 201)
      return
    }
    if (method === 'PATCH' && path.match(/^\/hr\/attendance\/[^/]+\/check-out$/)) {
      const id = path.split('/')[3]
      const row = attendanceRows.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      row.clockOut = `${row.date}T18:00:00.000Z`
      row.workMinutes = 480
      await okJson(route, { id: row.id })
      return
    }
    if (method === 'GET' && path === '/hr/work-schedules') {
      await okJson(route, workSchedules)
      return
    }
    if (method === 'GET' && path === '/hr/holidays') {
      await okJson(route, holidays.filter((x) => Number(sp.get('year') ?? 0) ? x.year === Number(sp.get('year')) : true))
      return
    }
    if (method === 'POST' && path === '/hr/holidays') {
      const body = parseBody<{ date?: string; name?: string; year?: number; type?: string }>(route)
      if (!body.date || !body.name || !body.year) {
        await fulfillJson(route, 422, { success: false, message: 'Missing fields', statusCode: 422 })
        return
      }
      const created = {
        id: makeLocalId('holiday', holidays),
        date: body.date,
        name: body.name,
        year: body.year,
        type: body.type ?? 'public',
        createdAt: new Date().toISOString(),
      }
      holidays.push(created)
      await okJson(route, { id: created.id }, 201)
      return
    }
    if (method === 'DELETE' && path.match(/^\/hr\/holidays\/[^/]+$/)) {
      const id = path.split('/')[3]
      const idx = holidays.findIndex((x) => x.id === id)
      if (idx >= 0) holidays.splice(idx, 1)
      await okJson(route, { ok: true })
      return
    }
    if (method === 'GET' && path === '/hr/overtime') {
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, overtimeRows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/hr/overtime') {
      const body = parseBody<{ date?: string; requestedHours?: number; reason?: string }>(route)
      if (!body.date || !body.requestedHours) {
        await fulfillJson(route, 422, { success: false, message: 'Missing fields', statusCode: 422 })
        return
      }
      const created = {
        id: makeLocalId('ot', overtimeRows),
        employeeId: 'emp-001',
        date: body.date,
        requestedHours: String(body.requestedHours),
        reason: body.reason ?? null,
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
        employeeCode: 'EMP-0001',
      }
      overtimeRows.unshift(created)
      await okJson(route, { id: created.id }, 201)
      return
    }
    if (method === 'PATCH' && path.match(/^\/hr\/overtime\/[^/]+\/approve$/)) {
      const id = path.split('/')[3]
      const row = overtimeRows.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      row.status = 'approved'
      row.approvedAt = new Date().toISOString()
      await okJson(route, { id: row.id })
      return
    }
    if (method === 'PATCH' && path.match(/^\/hr\/overtime\/[^/]+\/reject$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ rejectReason?: string }>(route)
      const row = overtimeRows.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'Not found', statusCode: 404 })
        return
      }
      if (!body.rejectReason?.trim()) {
        await fulfillJson(route, 422, { success: false, message: 'rejectReason required', statusCode: 422 })
        return
      }
      row.status = 'rejected'
      row.rejectionReason = body.rejectReason
      row.rejectedAt = new Date().toISOString()
      await okJson(route, { id: row.id })
      return
    }

    await route.continue()
  })
}

