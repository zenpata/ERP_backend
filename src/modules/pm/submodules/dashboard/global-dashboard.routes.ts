import { Elysia } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { GlobalDashboardService } from './global-dashboard.service'

export const globalDashboardRoutes = new Elysia({ prefix: '/global-dashboard' })
  .use(
    new Elysia()
      .use(
        requireAnyPermission(
          'pm:dashboard:view',
          'pm:budget:view',
          'pm:expense:view',
          'pm:progress:view'
        )
      )
      .get('/pm-snapshot', async () => {
        const data = await GlobalDashboardService.getPmSnapshot()
        return { success: true, data }
      })
  )
