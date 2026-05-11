import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '../../shared/db/client'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/middleware/error.middleware'
import { isEnabled, moduleFromPermission } from '../../shared/config/features'
import {
  employees,
  permissionAuditLogs,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../hr/hr.schema'

function permCode(p: { module: string; resource: string; action: string }) {
  return `${p.module}:${p.resource}:${p.action}`
}

export type UnlinkedEmployeeRow = {
  id: string
  code: string
  name: string
  email: string | null
}

export type SettingsUserRow = {
  id: string
  email: string
  name: string
  isActive: boolean
  roles: { id: string; name: string }[]
}

export type SettingsRoleRow = {
  id: string
  name: string
  description?: string | null
  isSystem: boolean
  permissions: { id: string; code: string }[]
}

export const SettingsService = {
  async listUsers(): Promise<SettingsUserRow[]> {
    const allUsers = await db.query.users.findMany({
      with: {
        employee: true,
        userRoles: { with: { role: true } },
      },
    })
    return allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.employee
        ? `${u.employee.firstnameTh} ${u.employee.lastnameTh}`.trim()
        : u.email.split('@')[0] ?? u.email,
      isActive: u.isActive,
      roles: u.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    }))
  },

  async listUnlinkedEmployees(): Promise<UnlinkedEmployeeRow[]> {
    const rows = await db
      .select({
        id: employees.id,
        code: employees.code,
        firstnameTh: employees.firstnameTh,
        lastnameTh: employees.lastnameTh,
        email: employees.email,
      })
      .from(employees)
      .where(and(isNull(employees.userId), eq(employees.status, 'active')))
      .orderBy(employees.code)
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: `${r.firstnameTh} ${r.lastnameTh}`.trim(),
      email: r.email ?? null,
    }))
  },

  async createUser(body: {
    email: string
    password: string
    roleIds?: string[]
    employeeId?: string
  }): Promise<SettingsUserRow> {
    const pwErrors: string[] = []
    if (body.password.length < 8) pwErrors.push('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    if (!/[A-Z]/.test(body.password)) pwErrors.push('ต้องมีตัวพิมพ์ใหญ่ (A–Z) อย่างน้อย 1 ตัว')
    if (!/[0-9]/.test(body.password)) pwErrors.push('ต้องมีตัวเลขอย่างน้อย 1 ตัว')
    if (pwErrors.length > 0) throw new ValidationError({ password: pwErrors })

    if (body.employeeId) {
      const emp = await db.query.employees.findFirst({
        where: eq(employees.id, body.employeeId),
      })
      if (!emp) throw new NotFoundError('employee')
      if (emp.userId) throw new ConflictError('EMPLOYEE_ALREADY_LINKED', 'พนักงานนี้มี user account แล้ว')
    }

    const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) })
    if (existing) {
      throw new ConflictError('EMAIL_CONFLICT', 'อีเมลนี้ถูกใช้งานแล้ว', {
        email: 'อีเมลนี้มีในระบบแล้ว',
      })
    }

    const passwordHash = await Bun.password.hash(body.password)

    const [created] = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        ...(body.employeeId ? { employeeId: body.employeeId } : {}),
      })
      .returning({ id: users.id })
    if (!created) throw new ValidationError({ email: ['สร้าง user ไม่สำเร็จ'] })

    if (body.employeeId) {
      await db
        .update(employees)
        .set({ userId: created.id, updatedAt: new Date() })
        .where(eq(employees.id, body.employeeId))
    }

    const uniqueRoleIds = [...new Set(body.roleIds ?? [])]
    if (uniqueRoleIds.length > 0) {
      await db
        .insert(userRoles)
        .values(uniqueRoleIds.map((roleId) => ({ userId: created.id, roleId })))
        .onConflictDoNothing()
    }

    const list = await SettingsService.listUsers()
    const row = list.find((x) => x.id === created.id)
    if (!row) throw new NotFoundError('user')
    return row
  },

  async patchUserRoles(userId: string, roleIds: string[]): Promise<SettingsUserRow> {
    const u = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!u) throw new NotFoundError('user')
    await db.delete(userRoles).where(eq(userRoles.userId, userId))
    const uniqueRoleIds = [...new Set(roleIds)]
    if (uniqueRoleIds.length > 0) {
      await db.insert(userRoles).values(uniqueRoleIds.map((roleId) => ({ userId, roleId })))
    }
    const list = await SettingsService.listUsers()
    const row = list.find((x) => x.id === userId)
    if (!row) throw new NotFoundError('user')
    return row
  },

  async patchUserActive(userId: string, isActive: boolean): Promise<SettingsUserRow> {
    const u = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!u) throw new NotFoundError('user')
    await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, userId))
    const list = await SettingsService.listUsers()
    const row = list.find((x) => x.id === userId)
    if (!row) throw new NotFoundError('user')
    return row
  },

  async listRoles(): Promise<SettingsRoleRow[]> {
    const all = await db.query.roles.findMany({
      with: {
        rolePermissions: { with: { permission: true } },
      },
    })
    return all.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: permCode(rp.permission),
      })),
    }))
  },

  async listPermissions(): Promise<{ id: string; code: string; description: string | null }[]> {
    const rows = await db.select().from(permissions)
    return rows
      .map((p) => ({ id: p.id, code: permCode(p), description: p.description }))
      .filter((p) => {
        const mod = moduleFromPermission(p.code)
        return mod === null || isEnabled(mod)
      })
  },

  async createRole(body: { name: string; description?: string }): Promise<SettingsRoleRow> {
    const [created] = await db
      .insert(roles)
      .values({
        name: body.name,
        description: body.description ?? null,
        isSystem: false,
      })
      .returning()
    if (!created) throw new ValidationError({ name: ['สร้าง role ไม่สำเร็จ'] })
    const list = await SettingsService.listRoles()
    return list.find((r) => r.id === created.id) as SettingsRoleRow
  },

  async updateRole(
    id: string,
    body: { name?: string; description?: string }
  ): Promise<SettingsRoleRow> {
    const r = await db.query.roles.findFirst({ where: eq(roles.id, id) })
    if (!r) throw new NotFoundError('role')
    if (r.isSystem) {
      throw new ForbiddenError('ไม่สามารถแก้ไข system role')
    }
    await db
      .update(roles)
      .set({
        ...body,
      })
      .where(eq(roles.id, id))
    const list = await SettingsService.listRoles()
    return list.find((x) => x.id === id) as SettingsRoleRow
  },

  async deleteRole(id: string): Promise<void> {
    const r = await db.query.roles.findFirst({ where: eq(roles.id, id) })
    if (!r) throw new NotFoundError('role')
    if (r.isSystem) {
      throw new ForbiddenError('ไม่สามารถลบ system role')
    }
    await db.delete(roles).where(eq(roles.id, id))
  },

  async putRolePermissions(
    roleId: string,
    permissionIds: string[],
    actorUserId: string
  ): Promise<SettingsRoleRow> {
    const r = await db.query.roles.findFirst({ where: eq(roles.id, roleId) })
    if (!r) throw new NotFoundError('role')
    if (r.name === 'super_admin') {
      throw new ForbiddenError('ไม่สามารถแก้ไขสิทธิ์ของ super_admin ผ่าน UI')
    }

    const existing = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId))
    const prev = new Set(existing.map((x) => x.permissionId))

    const valid =
      permissionIds.length > 0
        ? await db
            .select({ id: permissions.id })
            .from(permissions)
            .where(inArray(permissions.id, permissionIds))
        : []
    const validIds = new Set(valid.map((p) => p.id))

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    if (valid.length > 0) {
      await db
        .insert(rolePermissions)
        .values(valid.map((p) => ({ roleId, permissionId: p.id })))
        .onConflictDoNothing()
    }

    const auditRows: { actorUserId: string; roleId: string; permissionId: string; action: string }[] =
      []
    for (const pid of prev) {
      if (!validIds.has(pid)) {
        auditRows.push({ actorUserId, roleId, permissionId: pid, action: 'revoke' })
      }
    }
    for (const pid of validIds) {
      if (!prev.has(pid)) {
        auditRows.push({ actorUserId, roleId, permissionId: pid, action: 'grant' })
      }
    }
    if (auditRows.length > 0) {
      await db.insert(permissionAuditLogs).values(auditRows)
    }

    const list = await SettingsService.listRoles()
    return list.find((x) => x.id === roleId) as SettingsRoleRow
  },
}
