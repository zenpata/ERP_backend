import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { AttendanceService } from './attendance.service'

const workScheduleRoutes = new Elysia({ prefix: '/work-schedules' })
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:view'))
      .get('/', async ({ query }) => {
        const isActive =
          query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined
        const data = await AttendanceService.listWorkSchedules(
          isActive === undefined ? {} : { isActive }
        )
        return { success: true, data }
      }, { query: t.Object({ isActive: t.Optional(t.String()) }) })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:view'))
      .get('/:id', async ({ params }) => {
        const data = await AttendanceService.getWorkSchedule(params.id)
        return { success: true, data }
      }, { params: t.Object({ id: t.String() }) })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:manage'))
      .post(
        '/',
        async ({ body, set }) => {
          const data = await AttendanceService.createWorkSchedule(body)
          set.status = 201
          return { success: true, data, message: 'Created' }
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            startTime: t.String(),
            endTime: t.String(),
            breakDurationMinutes: t.Optional(t.Number()),
            lateToleranceMinutes: t.Optional(t.Number()),
            clockMode: t.Optional(t.String()),
            workDays: t.Optional(t.Array(t.Number())),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:manage'))
      .patch(
        '/:id',
        async ({ params, body }) => {
          const data = await AttendanceService.patchWorkSchedule(params.id, body)
          return { success: true, data, message: 'Updated' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            name: t.Optional(t.String()),
            startTime: t.Optional(t.String()),
            endTime: t.Optional(t.String()),
            breakDurationMinutes: t.Optional(t.Number()),
            lateToleranceMinutes: t.Optional(t.Number()),
            clockMode: t.Optional(t.String()),
            workDays: t.Optional(t.Array(t.Number())),
            isActive: t.Optional(t.Boolean()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:manage'))
      .post(
        '/:id/assign',
        async ({ params, body, set }) => {
          const data = await AttendanceService.assignWorkSchedule(params.id, {
            employeeIds: body.employeeIds,
            effectiveFrom: body.effectiveFrom,
          })
          set.status = 201
          return { success: true, data, message: 'Assigned' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            employeeIds: t.Array(t.String()),
            effectiveFrom: t.String({ format: 'date' }),
          }),
        }
      )
  )

const attendanceRecordRoutes = new Elysia({ prefix: '/attendance' })
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:view', 'hr:attendance:clock'))
      .get(
        '/',
        async ({ query, user }) => {
          const u = user as { userId: string }
          const q: Parameters<typeof AttendanceService.listAttendance>[1] = {}
          if (query.page !== undefined) q.page = Number(query.page)
          if (query.perPage !== undefined) q.perPage = Number(query.perPage)
          if (query.employeeId !== undefined) q.employeeId = query.employeeId
          if (query.departmentId !== undefined) q.departmentId = query.departmentId
          if (query.dateFrom !== undefined) q.dateFrom = query.dateFrom
          if (query.dateTo !== undefined) q.dateTo = query.dateTo
          const result = await AttendanceService.listAttendance(u.userId, q)
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            employeeId: t.Optional(t.String()),
            departmentId: t.Optional(t.String()),
            dateFrom: t.Optional(t.String()),
            dateTo: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:view', 'hr:attendance:clock'))
      .get(
        '/summary',
        async ({ query, user }) => {
          const u = user as { userId: string }
          const data = await AttendanceService.attendanceSummary(u.userId, {
            dateFrom: query.dateFrom,
            dateTo: query.dateTo,
            employeeId: query.employeeId,
            departmentId: query.departmentId,
          })
          return { success: true, data }
        },
        {
          query: t.Object({
            dateFrom: t.String({ format: 'date' }),
            dateTo: t.String({ format: 'date' }),
            employeeId: t.Optional(t.String()),
            departmentId: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:clock', 'hr:attendance:manage'))
      .post(
        '/check-in',
        async ({ body, user }) => {
          const u = user as { userId: string }
          const data = await AttendanceService.checkIn(u.userId, {
            employeeId: body.employeeId,
          })
          return { success: true, data, message: 'Checked in' }
        },
        { body: t.Object({ employeeId: t.Optional(t.String()) }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:clock', 'hr:attendance:manage'))
      .patch(
        '/:id/check-out',
        async ({ params, user }) => {
          const u = user as { userId: string }
          const data = await AttendanceService.checkOut(u.userId, params.id)
          return { success: true, data, message: 'Checked out' }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )

const holidayRoutes = new Elysia({ prefix: '/holidays' })
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:view'))
      .get('/', async ({ query }) => {
        const year = query.year !== undefined ? Number(query.year) : undefined
        const data = await AttendanceService.listHolidays(year)
        return { success: true, data }
      }, { query: t.Object({ year: t.Optional(t.Numeric()) }) })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:manage'))
      .post(
        '/',
        async ({ body, set }) => {
          const data = await AttendanceService.createHoliday(body)
          set.status = 201
          return { success: true, data, message: 'Created' }
        },
        {
          body: t.Object({
            date: t.String({ format: 'date' }),
            name: t.String({ minLength: 1 }),
            type: t.Optional(t.String()),
            year: t.Numeric({ minimum: 2000, maximum: 2100 }),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:attendance:manage'))
      .delete('/:id', async ({ params }) => {
        await AttendanceService.deleteHoliday(params.id)
        return { success: true, data: { ok: true }, message: 'Deleted successfully' }
      }, { params: t.Object({ id: t.String() }) })
  )

const overtimeRoutes = new Elysia({ prefix: '/overtime' })
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:overtime:view', 'hr:overtime:create'))
      .get(
        '/',
        async ({ query, user }) => {
          const u = user as { userId: string }
          const q: Parameters<typeof AttendanceService.listOvertime>[1] = {}
          if (query.page !== undefined) q.page = Number(query.page)
          if (query.perPage !== undefined) q.perPage = Number(query.perPage)
          if (query.status !== undefined) q.status = query.status
          if (query.employeeId !== undefined) q.employeeId = query.employeeId
          const result = await AttendanceService.listOvertime(u.userId, q)
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            status: t.Optional(t.String()),
            employeeId: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:overtime:view', 'hr:overtime:create'))
      .get('/:id', async ({ params, user }) => {
        const u = user as { userId: string }
        const data = await AttendanceService.getOvertimeForUser(u.userId, params.id)
        return { success: true, data }
      }, { params: t.Object({ id: t.String() }) })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:overtime:create'))
      .post(
        '/',
        async ({ body, user, set }) => {
          const u = user as { userId: string }
          const data = await AttendanceService.createOvertime(u.userId, body)
          set.status = 201
          return { success: true, data, message: 'Created' }
        },
        {
          body: t.Object({
            employeeId: t.Optional(t.String()),
            date: t.String({ format: 'date' }),
            requestedHours: t.Number({ minimum: 0.25, maximum: 24 }),
            reason: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:overtime:approve'))
      .patch(
        '/:id/approve',
        async ({ params, user }) => {
          const u = user as { userId: string }
          const data = await AttendanceService.approveOvertime(u.userId, params.id)
          return { success: true, data, message: 'Approved' }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:overtime:approve'))
      .patch(
        '/:id/reject',
        async ({ params, body, user }) => {
          const u = user as { userId: string }
          const data = await AttendanceService.rejectOvertime(u.userId, params.id, body)
          return { success: true, data, message: 'Rejected' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({ rejectReason: t.String({ minLength: 1 }) }),
        }
      )
  )

export const attendanceRoutes = new Elysia()
  .use(workScheduleRoutes)
  .use(attendanceRecordRoutes)
  .use(holidayRoutes)
  .use(overtimeRoutes)
