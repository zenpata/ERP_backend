import { Elysia } from 'elysia'
import { getPermissionsForUser } from '../auth/auth.service'
import type { AuthContextUser } from '../../shared/middleware/auth.middleware'
import { ForbiddenError } from '../../shared/middleware/error.middleware'
import { DashboardSummaryService, userCanAccessDashboard } from './dashboard-summary.service'

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' }).get('/summary', async (ctx) => {
  const { user } = ctx as typeof ctx & { user: AuthContextUser }
  const codes = await getPermissionsForUser(user.userId)
  if (!userCanAccessDashboard(codes)) {
    throw new ForbiddenError()
  }
  const data = await DashboardSummaryService.build(codes)
  return { success: true, data }
})
