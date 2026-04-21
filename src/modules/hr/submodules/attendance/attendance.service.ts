import { and, asc, count, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm'
import { getPermissionsForUser } from '../../../auth/auth.service'
import { db } from '../../../../shared/db/client'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import {
  attendanceRecords,
  employeeSchedules,
  employees,
  holidays,
  overtimeRequests,
  users,
  workSchedules,
} from '../../hr.schema'

function bangkokDateString(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

function wallMinutesBangkok(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return h * 60 + m
}

function timeStringToMinutes(t: string): number {
  const [hh = '0', mm = '0'] = t.split(':')
  return Number(hh) * 60 + Number(mm)
}

function scheduledWorkMinutes(ws: { startTime: unknown; endTime: unknown; breakDurationMinutes: number }): number {
  const st = typeof ws.startTime === 'string' ? ws.startTime : String(ws.startTime)
  const et = typeof ws.endTime === 'string' ? ws.endTime : String(ws.endTime)
  return Math.max(0, timeStringToMinutes(et) - timeStringToMinutes(st) - ws.breakDurationMinutes)
}

async function employeeIdForUser(userId: string): Promise<string | null> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) })
  return u?.employeeId ?? null
}

async function activeWorkScheduleForEmployee(
  employeeId: string,
  onDate: string
): Promise<(typeof workSchedules.$inferSelect) | null> {
  const rows = await db
    .select({ ws: workSchedules })
    .from(employeeSchedules)
    .innerJoin(workSchedules, eq(employeeSchedules.workScheduleId, workSchedules.id))
    .where(
      and(
        eq(employeeSchedules.employeeId, employeeId),
        lte(employeeSchedules.effectiveFrom, onDate),
        or(isNull(employeeSchedules.effectiveTo), gte(employeeSchedules.effectiveTo, onDate)),
        eq(workSchedules.isActive, true)
      )
    )
    .orderBy(desc(employeeSchedules.effectiveFrom))
    .limit(1)
  return rows[0]?.ws ?? null
}

async function isHolidayDate(d: string): Promise<boolean> {
  const [h] = await db.select({ id: holidays.id }).from(holidays).where(eq(holidays.date, d)).limit(1)
  return Boolean(h)
}

function isoDowBangkok(d: Date): number {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', weekday: 'short' }).format(d)
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return map[day] ?? 1
}

export const AttendanceService = {
  async listWorkSchedules(query?: { isActive?: boolean }) {
    const conds = []
    if (query?.isActive === true) conds.push(eq(workSchedules.isActive, true))
    if (query?.isActive === false) conds.push(eq(workSchedules.isActive, false))
    return db
      .select()
      .from(workSchedules)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(workSchedules.name))
  },

  async getWorkSchedule(id: string) {
    const row = await db.query.workSchedules.findFirst({ where: eq(workSchedules.id, id) })
    if (!row) throw new NotFoundError('Work schedule')
    return row
  },

  async createWorkSchedule(input: {
    name: string
    startTime: string
    endTime: string
    breakDurationMinutes?: number
    lateToleranceMinutes?: number
    clockMode?: string
    workDays?: number[]
  }) {
    const [row] = await db
      .insert(workSchedules)
      .values({
        name: input.name.trim(),
        startTime: input.startTime,
        endTime: input.endTime,
        breakDurationMinutes: input.breakDurationMinutes ?? 60,
        lateToleranceMinutes: input.lateToleranceMinutes ?? 0,
        clockMode: input.clockMode ?? 'self',
        workDays: input.workDays ?? [1, 2, 3, 4, 5],
        isActive: true,
      })
      .returning({ id: workSchedules.id })
    if (!row) throw new ValidationError({ body: ['Could not create schedule'] })
    return row
  },

  async patchWorkSchedule(
    id: string,
    input: Partial<{
      name: string
      startTime: string
      endTime: string
      breakDurationMinutes: number
      lateToleranceMinutes: number
      clockMode: string
      workDays: number[]
      isActive: boolean
    }>
  ) {
    await AttendanceService.getWorkSchedule(id)
    await db
      .update(workSchedules)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
        ...(input.breakDurationMinutes !== undefined
          ? { breakDurationMinutes: input.breakDurationMinutes }
          : {}),
        ...(input.lateToleranceMinutes !== undefined
          ? { lateToleranceMinutes: input.lateToleranceMinutes }
          : {}),
        ...(input.clockMode !== undefined ? { clockMode: input.clockMode } : {}),
        ...(input.workDays !== undefined ? { workDays: input.workDays } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      })
      .where(eq(workSchedules.id, id))
    return { id }
  },

  async assignWorkSchedule(
    scheduleId: string,
    input: { employeeIds: string[]; effectiveFrom: string }
  ): Promise<{ assignedCount: number; skipped: { employeeId: string; reason: string }[] }> {
    await AttendanceService.getWorkSchedule(scheduleId)
    const skipped: { employeeId: string; reason: string }[] = []
    let assignedCount = 0
    for (const eid of input.employeeIds) {
      const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, eid)).limit(1)
      if (!emp) {
        skipped.push({ employeeId: eid, reason: 'employee_not_found' })
        continue
      }
      const dup = await db
        .select({ id: employeeSchedules.id })
        .from(employeeSchedules)
        .where(
          and(
            eq(employeeSchedules.employeeId, eid),
            eq(employeeSchedules.workScheduleId, scheduleId),
            eq(employeeSchedules.effectiveFrom, input.effectiveFrom)
          )
        )
        .limit(1)
      if (dup[0]) {
        skipped.push({ employeeId: eid, reason: 'already_assigned' })
        continue
      }
      await db.insert(employeeSchedules).values({
        employeeId: eid,
        workScheduleId: scheduleId,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: null,
      })
      assignedCount++
    }
    return { assignedCount, skipped }
  },

  async listAttendance(
    userId: string,
    query: {
      page?: number
      perPage?: number
      employeeId?: string
      departmentId?: string
      dateFrom?: string
      dateTo?: string
    }
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const perms = await getPermissionsForUser(userId)
    const canViewAll = perms.includes('hr:attendance:view')
    const canClock = perms.includes('hr:attendance:clock')
    if (!canViewAll && !canClock) throw new ForbiddenError()

    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const selfEmp = await employeeIdForUser(userId)
    const conds = []
    if (query.dateFrom) conds.push(gte(attendanceRecords.date, query.dateFrom))
    if (query.dateTo) conds.push(lte(attendanceRecords.date, query.dateTo))
    if (!canViewAll) {
      if (!selfEmp) throw new ForbiddenError('No employee profile linked to this user')
      conds.push(eq(attendanceRecords.employeeId, selfEmp))
    } else {
      if (query.employeeId) conds.push(eq(attendanceRecords.employeeId, query.employeeId))
      if (query.departmentId) conds.push(eq(employees.departmentId, query.departmentId))
    }

    const whereClause = conds.length ? and(...conds) : undefined

    const [totalRow] = await db
      .select({ c: count() })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(whereClause)
    const total = Number(totalRow?.c ?? 0)

    const rows = await db
      .select({
        id: attendanceRecords.id,
        employeeId: attendanceRecords.employeeId,
        employeeCode: employees.code,
        firstnameTh: employees.firstnameTh,
        lastnameTh: employees.lastnameTh,
        date: attendanceRecords.date,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        workMinutes: attendanceRecords.workMinutes,
        overtimeMinutes: attendanceRecords.overtimeMinutes,
        breakMinutes: attendanceRecords.breakMinutes,
        lateMinutes: attendanceRecords.lateMinutes,
        status: attendanceRecords.status,
        clockMethod: attendanceRecords.clockMethod,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.clockIn))
      .limit(perPage)
      .offset(offset)

    return {
      data: rows.map((r) => ({
        ...r,
        clockIn: r.clockIn?.toISOString() ?? null,
        clockOut: r.clockOut?.toISOString() ?? null,
      })),
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    }
  },

  async checkIn(
    userId: string,
    input: { employeeId?: string }
  ): Promise<{
    id: string
    workedMinutes: number | null
    lateMinutes: number
    overtimeMinutes: number
  }> {
    const perms = await getPermissionsForUser(userId)
    const canManage = perms.includes('hr:attendance:manage')
    const canClock = perms.includes('hr:attendance:clock')
    if (!canClock && !canManage) throw new ForbiddenError()

    let employeeId = input.employeeId
    if (employeeId && !canManage) {
      throw new ForbiddenError()
    }
    if (!employeeId) {
      employeeId = (await employeeIdForUser(userId)) ?? undefined
    }
    if (!employeeId) throw new ValidationError({ employeeId: ['Employee is required'] })

    const today = bangkokDateString()
    const now = new Date()
    const holiday = await isHolidayDate(today)
    const ws = await activeWorkScheduleForEmployee(employeeId, today)
    const breakM = ws?.breakDurationMinutes ?? 60
    let lateM = 0
    if (ws && !holiday) {
      const wd = isoDowBangkok(now)
      const days = (ws.workDays as number[]) ?? []
      if (days.includes(wd)) {
        const startM = timeStringToMinutes(typeof ws.startTime === 'string' ? ws.startTime : String(ws.startTime))
        const tol = ws.lateToleranceMinutes ?? 0
        const inM = wallMinutesBangkok(now)
        lateM = Math.max(0, inM - startM - tol)
      }
    }

    const [existing] = await db
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, today)))
      .limit(1)

    if (existing?.clockIn) {
      throw new ValidationError({ clockIn: ['Already checked in today'] })
    }

    const status = holiday ? 'holiday' : 'present'

    if (existing) {
      await db
        .update(attendanceRecords)
        .set({
          clockIn: now,
          clockMethod: canManage ? 'admin' : 'self',
          lateMinutes: lateM,
          breakMinutes: breakM,
          status,
        })
        .where(eq(attendanceRecords.id, existing.id))
      return {
        id: existing.id,
        workedMinutes: null,
        lateMinutes: lateM,
        overtimeMinutes: 0,
      }
    }

    const [ins] = await db
      .insert(attendanceRecords)
      .values({
        employeeId,
        date: today,
        clockIn: now,
        clockMethod: canManage ? 'admin' : 'self',
        lateMinutes: lateM,
        breakMinutes: breakM,
        status,
        overtimeMinutes: 0,
      })
      .returning({ id: attendanceRecords.id })
    if (!ins) throw new ValidationError({ body: ['Could not check in'] })
    return { id: ins.id, workedMinutes: null, lateMinutes: lateM, overtimeMinutes: 0 }
  },

  async checkOut(
    userId: string,
    recordId: string
  ): Promise<{ id: string; workedMinutes: number; lateMinutes: number; overtimeMinutes: number }> {
    const perms = await getPermissionsForUser(userId)
    const canManage = perms.includes('hr:attendance:manage')
    const canClock = perms.includes('hr:attendance:clock')
    if (!canClock && !canManage) throw new ForbiddenError()

    const [row] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, recordId)).limit(1)
    if (!row) throw new NotFoundError('Attendance record')
    if (!row.clockIn) throw new ValidationError({ clockIn: ['Must check in first'] })
    if (row.clockOut) throw new ValidationError({ clockOut: ['Already checked out'] })

    const selfEmp = await employeeIdForUser(userId)
    if (!canManage) {
      if (!selfEmp || row.employeeId !== selfEmp) throw new ForbiddenError()
    }

    const now = new Date()
    const grossMin = Math.floor((now.getTime() - row.clockIn.getTime()) / 60_000)
    const breakM = row.breakMinutes ?? 0
    const workM = Math.max(0, grossMin - breakM)

    const ws = await activeWorkScheduleForEmployee(row.employeeId, row.date)
    const schedM = ws ? scheduledWorkMinutes(ws) : 8 * 60
    const otM = Math.max(0, workM - schedM)

    await db
      .update(attendanceRecords)
      .set({
        clockOut: now,
        workMinutes: workM,
        overtimeMinutes: otM,
      })
      .where(eq(attendanceRecords.id, recordId))

    return {
      id: recordId,
      workedMinutes: workM,
      lateMinutes: row.lateMinutes ?? 0,
      overtimeMinutes: otM,
    }
  },

  async attendanceSummary(
    userId: string,
    query: { dateFrom: string; dateTo: string; employeeId?: string; departmentId?: string }
  ) {
    const perms = await getPermissionsForUser(userId)
    const canViewAll = perms.includes('hr:attendance:view')
    const canClock = perms.includes('hr:attendance:clock')
    if (!canViewAll && !canClock) throw new ForbiddenError()

    const conds = [
      gte(attendanceRecords.date, query.dateFrom),
      lte(attendanceRecords.date, query.dateTo),
    ]
    if (!canViewAll) {
      const selfEmp = await employeeIdForUser(userId)
      if (!selfEmp) throw new ForbiddenError()
      conds.push(eq(attendanceRecords.employeeId, selfEmp))
    } else {
      if (query.employeeId) conds.push(eq(attendanceRecords.employeeId, query.employeeId))
      if (query.departmentId) conds.push(eq(employees.departmentId, query.departmentId))
    }

    const [agg] = await db
      .select({
        days: count(),
        present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')`,
        late: sql<number>`count(*) filter (where coalesce(${attendanceRecords.lateMinutes},0) > 0)`,
        absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')`,
        totalWork: sql<string>`coalesce(sum(${attendanceRecords.workMinutes}),0)`,
        totalOt: sql<string>`coalesce(sum(${attendanceRecords.overtimeMinutes}),0)`,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(and(...conds))

    return {
      period: { dateFrom: query.dateFrom, dateTo: query.dateTo },
      totals: {
        recordDays: Number(agg?.days ?? 0),
        presentDays: Number(agg?.present ?? 0),
        lateDays: Number(agg?.late ?? 0),
        absentDays: Number(agg?.absent ?? 0),
        totalWorkMinutes: Number(agg?.totalWork ?? 0),
        totalOvertimeMinutes: Number(agg?.totalOt ?? 0),
      },
    }
  },

  async listHolidays(year?: number) {
    const conds = []
    if (year !== undefined) conds.push(eq(holidays.year, year))
    return db
      .select()
      .from(holidays)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(holidays.date))
  },

  async createHoliday(input: { date: string; name: string; type?: string; year: number }) {
    const [row] = await db
      .insert(holidays)
      .values({
        date: input.date,
        name: input.name.trim(),
        type: input.type ?? 'national',
        year: input.year,
      })
      .onConflictDoNothing({ target: holidays.date })
      .returning({ id: holidays.id })
    if (!row) {
      throw new ConflictError('HOLIDAY_DUPLICATE', 'A holiday already exists on this date')
    }
    return row
  },

  async deleteHoliday(id: string) {
    await db.delete(holidays).where(eq(holidays.id, id))
    return { ok: true }
  },

  async listOvertime(
    userId: string,
    query: { page?: number; perPage?: number; status?: string; employeeId?: string }
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const perms = await getPermissionsForUser(userId)
    const canView = perms.includes('hr:overtime:view')
    const canCreate = perms.includes('hr:overtime:create')
    if (!canView && !canCreate) throw new ForbiddenError()

    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage
    const conds = []
    if (query.status) conds.push(eq(overtimeRequests.status, query.status))
    if (!canView) {
      const self = await employeeIdForUser(userId)
      if (!self) throw new ForbiddenError()
      conds.push(eq(overtimeRequests.employeeId, self))
    } else if (query.employeeId) {
      conds.push(eq(overtimeRequests.employeeId, query.employeeId))
    }
    const whereClause = conds.length ? and(...conds) : undefined

    const [totalRow] = await db.select({ c: count() }).from(overtimeRequests).where(whereClause)
    const total = Number(totalRow?.c ?? 0)

    const rows = await db
      .select({
        id: overtimeRequests.id,
        employeeId: overtimeRequests.employeeId,
        date: overtimeRequests.date,
        requestedHours: overtimeRequests.requestedHours,
        reason: overtimeRequests.reason,
        status: overtimeRequests.status,
        approvedBy: overtimeRequests.approvedBy,
        approvedAt: overtimeRequests.approvedAt,
        rejectedAt: overtimeRequests.rejectedAt,
        rejectionReason: overtimeRequests.rejectionReason,
        createdAt: overtimeRequests.createdAt,
        employeeCode: employees.code,
      })
      .from(overtimeRequests)
      .innerJoin(employees, eq(overtimeRequests.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(overtimeRequests.createdAt))
      .limit(perPage)
      .offset(offset)

    return {
      data: rows.map((r) => ({
        ...r,
        approvedAt: r.approvedAt?.toISOString() ?? null,
        rejectedAt: r.rejectedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    }
  },

  async getOvertime(id: string) {
    const row = await db.query.overtimeRequests.findFirst({ where: eq(overtimeRequests.id, id) })
    if (!row) throw new NotFoundError('Overtime request')
    return row
  },

  async getOvertimeForUser(userId: string, id: string) {
    const row = await AttendanceService.getOvertime(id)
    const perms = await getPermissionsForUser(userId)
    if (perms.includes('hr:overtime:view')) return row
    if (perms.includes('hr:overtime:create')) {
      const self = await employeeIdForUser(userId)
      if (self && row.employeeId === self) return row
    }
    throw new ForbiddenError()
  },

  async createOvertime(userId: string, input: { employeeId?: string; date: string; requestedHours: number; reason?: string }) {
    const perms = await getPermissionsForUser(userId)
    if (!perms.includes('hr:overtime:create')) throw new ForbiddenError()
    const self = await employeeIdForUser(userId)
    let eid = input.employeeId
    if (!eid) eid = self ?? undefined
    if (!eid) throw new ValidationError({ employeeId: ['Employee is required'] })
    if (input.employeeId && input.employeeId !== self && !perms.includes('hr:attendance:manage')) {
      throw new ForbiddenError()
    }

    const [row] = await db
      .insert(overtimeRequests)
      .values({
        employeeId: eid,
        date: input.date,
        requestedHours: String(input.requestedHours),
        reason: input.reason,
        status: 'pending',
      })
      .returning({ id: overtimeRequests.id })
    if (!row) throw new ValidationError({ body: ['Could not create overtime request'] })
    return row
  },

  async approveOvertime(userId: string, id: string) {
    if (!(await getPermissionsForUser(userId)).includes('hr:overtime:approve')) throw new ForbiddenError()
    const ot = await AttendanceService.getOvertime(id)
    if (ot.status !== 'pending') {
      throw new ValidationError({ status: ['Only pending requests can be approved'] })
    }
    const approverEmp = await employeeIdForUser(userId)
    await db
      .update(overtimeRequests)
      .set({
        status: 'approved',
        approvedBy: approverEmp,
        approvedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
      })
      .where(eq(overtimeRequests.id, id))
    return { id, status: 'approved' as const }
  },

  async rejectOvertime(userId: string, id: string, input: { rejectReason: string }) {
    if (!(await getPermissionsForUser(userId)).includes('hr:overtime:approve')) throw new ForbiddenError()
    const ot = await AttendanceService.getOvertime(id)
    if (ot.status !== 'pending') {
      throw new ValidationError({ status: ['Only pending requests can be rejected'] })
    }
    await db
      .update(overtimeRequests)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: input.rejectReason.trim(),
        approvedBy: null,
        approvedAt: null,
      })
      .where(eq(overtimeRequests.id, id))
    return { id, status: 'rejected' as const }
  },
}
