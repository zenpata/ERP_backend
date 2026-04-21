import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../shared/middleware/auth.middleware'
import { ROLES, requireRole } from '../../shared/middleware/rbac.middleware'
import { SettingsService } from './settings.service'

const adminOnly = requireRole(ROLES.SUPER_ADMIN)

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .use(adminOnly)
  .get('/users', async () => {
    const data = await SettingsService.listUsers()
    return { success: true, data }
  })
  .patch(
    '/users/:id/roles',
    async ({ params, body }) => {
      const data = await SettingsService.patchUserRoles(params.id, body.roleIds)
      return { success: true, data }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        roleIds: t.Array(t.String()),
      }),
    }
  )
  .patch(
    '/users/:id/activate',
    async ({ params, body }) => {
      const data = await SettingsService.patchUserActive(params.id, body.isActive)
      return { success: true, data }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        isActive: t.Boolean(),
      }),
    }
  )
  .get('/roles', async () => {
    const data = await SettingsService.listRoles()
    return { success: true, data }
  })
  .get('/permissions', async () => {
    const data = await SettingsService.listPermissions()
    return { success: true, data }
  })
  .post(
    '/roles',
    async ({ body }) => {
      const data = await SettingsService.createRole(body)
      return { success: true, data }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/roles/:id',
    async ({ params, body }) => {
      const data = await SettingsService.updateRole(params.id, body)
      return { success: true, data }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    '/roles/:id',
    async ({ params }) => {
      await SettingsService.deleteRole(params.id)
      return { success: true, data: null }
    },
    { params: t.Object({ id: t.String() }) }
  )
  .put(
    '/roles/:id/permissions',
    async (ctx) => {
      const { user, params, body } = ctx as typeof ctx & {
        user: AuthContextUser
        params: { id: string }
        body: { permissionIds: string[] }
      }
      const data = await SettingsService.putRolePermissions(
        params.id,
        body.permissionIds,
        user.userId
      )
      return { success: true, data }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        permissionIds: t.Array(t.String()),
      }),
    }
  )
