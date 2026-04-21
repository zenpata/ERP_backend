import { and, eq, inArray } from 'drizzle-orm'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '../../shared/db/client'
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '../../shared/middleware/error.middleware'
import {
  employees,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../hr/hr.schema'
import type { AuthMeResponse, LoginResponse } from './auth.types'

const getSecret = (): Uint8Array => {
  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return new TextEncoder().encode(secret)
}

/** Short-lived access token (Bearer). */
const ACCESS_TTL = process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m'
/** Long-lived refresh token — spec: `JWT_EXPIRES_IN` names the refresh lifetime (default 7d). */
const REFRESH_TTL = process.env['JWT_EXPIRES_IN'] ?? '7d'

function permissionCode(p: { module: string; resource: string; action: string }): string {
  return `${p.module}:${p.resource}:${p.action}`
}

async function loadRolesForUser(userId: string): Promise<string[]> {
  const ur = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, userId),
    with: { role: true },
  })
  return ur.map((r) => r.role.name)
}

export async function getPermissionsForUser(userId: string): Promise<string[]> {
  const ur = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, userId),
  })
  if (ur.length === 0) return []
  const roleIds = ur.map((r) => r.roleId)
  const rp = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(inArray(rolePermissions.roleId, roleIds))
  const permIds = [...new Set(rp.map((x) => x.permissionId))]
  if (permIds.length === 0) return []
  const perms = await db
    .select()
    .from(permissions)
    .where(inArray(permissions.id, permIds))
  return perms.map((p) => permissionCode(p))
}

export async function buildAuthMeResponse(userId: string): Promise<AuthMeResponse> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      employee: true,
    },
  })
  if (!user) throw new UnauthorizedError('ไม่พบผู้ใช้')

  const [roleNames, permCodes] = await Promise.all([
    loadRolesForUser(userId),
    getPermissionsForUser(userId),
  ])

  let employee: { id: string; name: string; code: string } | undefined
  if (user.employee) {
    const e = user.employee
    employee = {
      id: e.id,
      code: e.code,
      name: `${e.firstnameTh} ${e.lastnameTh}`.trim(),
    }
  }

  const name =
    employee?.name ??
    user.email.split('@')[0] ??
    user.email

  const base: AuthMeResponse = {
    id: user.id,
    email: user.email,
    name,
    roles: roleNames,
    permissions: permCodes,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
  }
  if (employee) {
    return { ...base, employee }
  }
  return base
}

export async function signAccessToken(userId: string, email: string, rolesList: string[]) {
  return await new SignJWT({ email, roles: rolesList })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(getSecret())
}

async function signRefreshToken(userId: string) {
  return await new SignJWT({ typ: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(getSecret())
}

export const AuthService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.isActive, true)),
    })
    if (!user) {
      throw new UnauthorizedError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }
    if (user.loginLocked) {
      throw new ForbiddenError('บัญชีถูกล็อก กรุณาติดต่อ Admin เพื่อปลดล็อก')
    }

    const ok = await Bun.password.verify(password, user.passwordHash)
    if (!ok) {
      const next = user.failedLoginAttempts + 1
      if (next >= 5) {
        await db
          .update(users)
          .set({
            failedLoginAttempts: next,
            loginLocked: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
        throw new ForbiddenError('บัญชีถูกล็อก กรุณาติดต่อ Admin เพื่อปลดล็อก')
      }
      await db
        .update(users)
        .set({
          failedLoginAttempts: next,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
      throw new UnauthorizedError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }

    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    const roleNames = await loadRolesForUser(user.id)
    const [accessToken, refreshToken, me] = await Promise.all([
      signAccessToken(user.id, user.email, roleNames),
      signRefreshToken(user.id),
      buildAuthMeResponse(user.id),
    ])

    return { accessToken, refreshToken, user: me }
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let sub: string
    try {
      const { payload } = await jwtVerify(refreshToken, getSecret())
      if (payload['typ'] !== 'refresh') throw new Error('invalid')
      sub = payload.sub as string
      if (!sub) throw new Error('invalid')
    } catch {
      throw new UnauthorizedError('Refresh token ไม่ถูกต้องหรือหมดอายุ')
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, sub), eq(users.isActive, true)),
    })
    if (!user) throw new UnauthorizedError('ไม่พบผู้ใช้')

    const roleNames = await loadRolesForUser(user.id)
    const [accessToken, newRefresh] = await Promise.all([
      signAccessToken(user.id, user.email, roleNames),
      signRefreshToken(user.id),
    ])
    return { accessToken, refreshToken: newRefresh }
  },

  validateNewPassword(newPassword: string): void {
    const errors: string[] = []
    if (newPassword.length < 8) {
      errors.push('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
    }
    if (!/[A-Z]/.test(newPassword)) {
      errors.push('รหัสผ่านใหม่ต้องมีตัวพิมพ์ใหญ่ (A–Z) อย่างน้อย 1 ตัว')
    }
    if (!/[0-9]/.test(newPassword)) {
      errors.push('รหัสผ่านใหม่ต้องมีตัวเลขอย่างน้อย 1 ตัว')
    }
    if (errors.length > 0) {
      throw new ValidationError({ newPassword: errors })
    }
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    AuthService.validateNewPassword(newPassword)
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })
    if (!user) throw new UnauthorizedError()
    const ok = await Bun.password.verify(currentPassword, user.passwordHash)
    if (!ok) {
      throw new ValidationError({ currentPassword: ['รหัสผ่านปัจจุบันไม่ถูกต้อง'] })
    }
    const passwordHash = await Bun.password.hash(newPassword)
    await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        loginLocked: false,
        failedLoginAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  },
}
