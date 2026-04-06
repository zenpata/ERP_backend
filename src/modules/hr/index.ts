import { Elysia } from 'elysia'
import { employeeRoutes } from './submodules/employee/employee.routes'

// ============================================================
// hr/index.ts — HR module plugin
// prefix: /api/hr
// ============================================================

// TODO: เพิ่ม routes เมื่อ implement submodule แต่ละตัวแล้ว
// import { attendanceRoutes } from './submodules/attendance/attendance.routes'
// import { leaveRoutes } from './submodules/leave/leave.routes'
// import { payrollRoutes } from './submodules/payroll/payroll.routes'

export const hrModule = new Elysia({ prefix: '/hr' })
  .use(employeeRoutes)
// .use(attendanceRoutes)
// .use(leaveRoutes)
// .use(payrollRoutes)
