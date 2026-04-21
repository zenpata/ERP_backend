import { Elysia } from 'elysia'
import { getPermissionsForUser } from '../../modules/auth/auth.service'
import type { AuthContextUser } from './auth.middleware'
import { ForbiddenError } from './error.middleware'

// ============================================================
// rbac.middleware.ts — Role-based access control
// ============================================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HR_ADMIN: 'hr_admin',
  HR_MANAGER: 'hr_manager',
  HR_STAFF: 'hr_staff',
  FINANCE_MANAGER: 'finance_manager',
  FINANCE_STAFF: 'finance_staff',
  PM_MANAGER: 'pm_manager',
  PM_STAFF: 'pm_staff',
  EMPLOYEE: 'employee',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

function hasAnyRole(userRoles: string[], allowed: Role[]): boolean {
  return allowed.some((r) => userRoles.includes(r))
}

/**
 * สร้าง middleware ที่ตรวจสอบว่า user มี role ที่อนุญาตอย่างน้อยหนึ่ง role
 */
export function requireRole(...allowedRoles: Role[]): ReturnType<typeof Elysia.prototype.use> {
  return new Elysia({ name: `rbac-${allowedRoles.join('-')}` }).onBeforeHandle((ctx) => {
    const { user } = ctx as typeof ctx & { user: AuthContextUser }
    if (!hasAnyRole(user.roles, allowedRoles)) {
      throw new ForbiddenError()
    }
  }) as ReturnType<typeof Elysia.prototype.use>
}

/** super_admin bypasses; otherwise need one of the listed permissions */
export function requireAnyPermission(...perms: string[]): ReturnType<typeof Elysia.prototype.use> {
  return new Elysia({ name: `rbac-perm-${perms.slice(0, 3).join('-')}` }).onBeforeHandle(async (ctx) => {
    const { user } = ctx as typeof ctx & { user: AuthContextUser }
    if (user.roles.includes(ROLES.SUPER_ADMIN)) return
    const codes = await getPermissionsForUser(user.userId)
    if (!perms.some((p) => codes.includes(p))) {
      throw new ForbiddenError()
    }
  }) as ReturnType<typeof Elysia.prototype.use>
}
