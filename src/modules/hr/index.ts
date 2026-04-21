import { Elysia } from 'elysia'
import { attendanceRoutes } from './submodules/attendance/attendance.routes'
import { departmentRoutes } from './submodules/department/department.routes'
import { employeeRoutes } from './submodules/employee/employee.routes'
import { leaveRoutes } from './submodules/leave/leave.routes'
import { payrollRoutes } from './submodules/payroll/payroll.routes'
import { positionRoutes } from './submodules/position/position.routes'

// ============================================================
// hr/index.ts — HR module plugin
// prefix: /api/hr
// ============================================================

export const hrModule = new Elysia({ prefix: '/hr' })
  .use(departmentRoutes)
  .use(positionRoutes)
  .use(employeeRoutes)
  .use(leaveRoutes)
  .use(attendanceRoutes)
  .use(payrollRoutes)
