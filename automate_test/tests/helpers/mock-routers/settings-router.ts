import type { Page } from '@playwright/test'
import { apiUrlGlob, fulfillJson } from '../auth-api-mock'
import { makeLocalId, type MockErpState } from '../realistic-data'
import { containsText, getApiPath, listJson, listPagingFromUrl, okJson, parseBody } from './common'

export async function installSettingsMockRouter(page: Page, state: MockErpState) {
  await page.route(apiUrlGlob('settings/**'), async (route) => {
    const req = route.request()
    const method = req.method()
    const url = req.url()
    const path = getApiPath(url)
    const sp = new URL(url).searchParams

    if (method === 'GET' && path === '/settings/users') {
      const search = (sp.get('search') ?? '').trim()
      const rows = state.users.filter((u) =>
        search ? containsText(`${u.email} ${u.name} ${u.roles.map((r) => r.name).join(' ')}`, search) : true,
      )
      await okJson(route, rows)
      return
    }
    if (method === 'PATCH' && path.match(/^\/settings\/users\/[^/]+\/roles$/)) {
      const userId = path.split('/')[3]
      const body = parseBody<{ roleIds?: string[] }>(route)
      const row = state.users.find((x) => x.id === userId)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'User not found', statusCode: 404 })
        return
      }
      const roleIds = body.roleIds ?? []
      row.roles = roleIds
        .map((roleId) => {
          const role = state.roles.find((x) => x.id === roleId)
          return role ? { id: role.id, name: role.name } : null
        })
        .filter((x): x is { id: string; name: string } => x != null)
      state.auditLogs.unshift({
        id: makeLocalId('audit', state.auditLogs),
        occurredAt: new Date().toISOString(),
        actorUserId: 'user-admin',
        entityType: 'settings_user',
        entityId: row.id,
        action: 'UPDATE_ROLES',
      })
      await okJson(route, row)
      return
    }
    if (method === 'PATCH' && path.match(/^\/settings\/users\/[^/]+\/activate$/)) {
      const userId = path.split('/')[3]
      const body = parseBody<{ isActive?: boolean }>(route)
      const row = state.users.find((x) => x.id === userId)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'User not found', statusCode: 404 })
        return
      }
      row.isActive = Boolean(body.isActive)
      state.auditLogs.unshift({
        id: makeLocalId('audit', state.auditLogs),
        occurredAt: new Date().toISOString(),
        actorUserId: 'user-admin',
        entityType: 'settings_user',
        entityId: row.id,
        action: row.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      })
      await okJson(route, row)
      return
    }

    if (method === 'GET' && path === '/settings/roles') {
      await okJson(route, state.roles)
      return
    }
    if (method === 'GET' && path === '/settings/permissions') {
      await okJson(route, state.permissions)
      return
    }
    if (method === 'PUT' && path.match(/^\/settings\/roles\/[^/]+\/permissions$/)) {
      const roleId = path.split('/')[3]
      const body = parseBody<{ permissionIds?: string[] }>(route)
      const role = state.roles.find((x) => x.id === roleId)
      if (!role) {
        await fulfillJson(route, 404, { success: false, message: 'Role not found', statusCode: 404 })
        return
      }
      role.permissions = (body.permissionIds ?? [])
        .map((permissionId) => state.permissions.find((x) => x.id === permissionId))
        .filter((x): x is { id: string; code: string; description: string | null } => x != null)
      state.auditLogs.unshift({
        id: makeLocalId('audit', state.auditLogs),
        occurredAt: new Date().toISOString(),
        actorUserId: 'user-admin',
        entityType: 'settings_role',
        entityId: role.id,
        action: 'UPDATE_PERMISSIONS',
      })
      await okJson(route, role)
      return
    }

    if (method === 'GET' && path === '/settings/company') {
      await okJson(route, state.companySettings)
      return
    }
    if (method === 'PUT' && path === '/settings/company') {
      const body = parseBody<Record<string, unknown>>(route)
      Object.assign(state.companySettings, body)
      await okJson(route, state.companySettings)
      return
    }
    if (method === 'POST' && path === '/settings/company/logo') {
      const body = parseBody<{ logoUrl?: string }>(route)
      if (!body.logoUrl?.startsWith('http')) {
        await fulfillJson(route, 422, { success: false, message: 'invalid logoUrl', statusCode: 422 })
        return
      }
      state.companySettings.logoUrl = body.logoUrl
      await okJson(route, state.companySettings)
      return
    }

    if (method === 'GET' && path === '/settings/fiscal-periods') {
      await okJson(route, state.fiscalPeriods)
      return
    }
    if (method === 'POST' && path === '/settings/fiscal-periods/generate') {
      const body = parseBody<{ year?: number }>(route)
      if (!body.year) {
        await fulfillJson(route, 422, { success: false, message: 'year required', statusCode: 422 })
        return
      }
      const year = body.year
      for (let month = 1; month <= 12; month += 1) {
        const id = `fiscal-${year}-${String(month).padStart(2, '0')}`
        if (!state.fiscalPeriods.some((x) => x.id === id)) {
          state.fiscalPeriods.push({
            id,
            year,
            month,
            startDate: `${year}-${String(month).padStart(2, '0')}-01`,
            endDate: `${year}-${String(month).padStart(2, '0')}-28`,
            status: 'open',
          })
        }
      }
      await okJson(route, state.fiscalPeriods.filter((x) => x.year === year))
      return
    }
    if (method === 'PATCH' && path.match(/^\/settings\/fiscal-periods\/[^/]+\/close$/)) {
      const id = path.split('/')[3]
      const row = state.fiscalPeriods.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      row.status = 'closed'
      await okJson(route, row)
      return
    }
    if (method === 'PATCH' && path.match(/^\/settings\/fiscal-periods\/[^/]+\/reopen$/)) {
      const id = path.split('/')[3]
      const row = state.fiscalPeriods.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      row.status = 'open'
      await okJson(route, row)
      return
    }

    if (method === 'GET' && path === '/settings/notification-configs') {
      await okJson(route, state.notificationConfigs)
      return
    }
    if (method === 'PUT' && path === '/settings/notification-configs') {
      const body = parseBody<{ emailDigest?: boolean; pushEnabled?: boolean }>(route)
      if (typeof body.emailDigest === 'boolean') state.notificationConfigs.emailDigest = body.emailDigest
      if (typeof body.pushEnabled === 'boolean') state.notificationConfigs.pushEnabled = body.pushEnabled
      await okJson(route, state.notificationConfigs)
      return
    }

    if (method === 'GET' && path === '/settings/audit-logs') {
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, state.auditLogs, pageNo, perPage)
      return
    }

    await route.continue()
  })

  await page.route(apiUrlGlob('notifications'), async (route) => {
    const req = route.request()
    const method = req.method()
    const url = req.url()
    const path = getApiPath(url)
    const sp = new URL(url).searchParams

    if (method === 'GET' && path === '/notifications') {
      const unreadOnly = sp.get('unreadOnly') === 'true'
      const rows = state.notifications.filter((x) => (unreadOnly ? !x.readAt : true))
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'GET' && path === '/notifications/unread-count') {
      const count = state.notifications.filter((x) => !x.readAt).length
      await okJson(route, { count })
      return
    }
    if (method === 'PATCH' && path.match(/^\/notifications\/[^/]+\/read$/)) {
      const id = path.split('/')[2]
      const row = state.notifications.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'notification not found', statusCode: 404 })
        return
      }
      row.readAt = new Date().toISOString()
      await okJson(route, row)
      return
    }
    if (method === 'POST' && path === '/notifications/mark-all-read') {
      let updated = 0
      for (const row of state.notifications) {
        if (!row.readAt) {
          row.readAt = new Date().toISOString()
          updated += 1
        }
      }
      await okJson(route, { updated })
      return
    }

    await route.continue()
  })
}
