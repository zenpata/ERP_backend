import { eq, inArray } from 'drizzle-orm'
import { db } from '../../shared/db/client'
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/middleware/error.middleware'
import {
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
    return rows.map((p) => ({
      id: p.id,
      code: permCode(p),
      description: p.description,
    }))
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
