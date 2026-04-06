import { Elysia } from 'elysia'
import { ForbiddenError } from './error.middleware'
import { authMiddleware } from './auth.middleware'

// ============================================================
// rbac.middleware.ts — Role-based access control
// ============================================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HR_MANAGER: 'hr_manager',
  HR_STAFF: 'hr_staff',
  FINANCE_MANAGER: 'finance_manager',
  FINANCE_STAFF: 'finance_staff',
  PM_MANAGER: 'pm_manager',
  PM_STAFF: 'pm_staff',
  EMPLOYEE: 'employee',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * สร้าง middleware ที่ตรวจสอบว่า user มี role ที่อนุญาต
 */
export function requireRole(...allowedRoles: Role[]): ReturnType<typeof Elysia.prototype.use> {
  return new Elysia({ name: `rbac-${allowedRoles.join('-')}` })
    .use(authMiddleware)
    .onBeforeHandle(({ user }) => {
      if (!allowedRoles.includes(user.role as Role)) {
        throw new ForbiddenError()
      }
    }) as ReturnType<typeof Elysia.prototype.use>
}
