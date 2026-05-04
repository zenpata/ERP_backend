import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { ROLES } from '../../../../shared/middleware/rbac.middleware'
import { PeriodLockService } from './period-lock.service'
import type { AuthContextUser } from '../../../../shared/middleware/auth.middleware'

// ============================================================
// period-lock.routes.ts — Accounting Period Lock (R3-08)
// prefix: /accounting-periods (under /api/finance)
// ============================================================

export const periodLockRoutes = new Elysia({ prefix: '/accounting-periods' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:journal:view', 'finance:account:view'))
      .get('/', async () => {
        const data = await PeriodLockService.list()
        return { success: true, data }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:journal:create'))
      .post(
        '/',
        async ({ body }) => {
          const data = await PeriodLockService.getOrCreate(body.period)
          return { success: true, data }
        },
        {
          body: t.Object({
            period: t.String({ pattern: '^\\d{4}-\\d{2}$' }),
          }),
        }
      )
      .post(
        '/:period/lock',
        async (ctx) => {
          const { user } = ctx as typeof ctx & { user: AuthContextUser }
          const data = await PeriodLockService.lock(ctx.params.period, user.userId)
          return { success: true, data }
        },
        {
          params: t.Object({ period: t.String({ pattern: '^\\d{4}-\\d{2}$' }) }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:journal:create'))
      .post(
        '/:period/unlock',
        async (ctx) => {
          const { user } = ctx as typeof ctx & { user: AuthContextUser }
          const isSuperAdmin = user.roles.includes(ROLES.SUPER_ADMIN)
          const data = await PeriodLockService.unlock(
            ctx.params.period,
            user.userId,
            ctx.body.reason,
            isSuperAdmin
          )
          return { success: true, data }
        },
        {
          params: t.Object({ period: t.String({ pattern: '^\\d{4}-\\d{2}$' }) }),
          body: t.Object({
            reason: t.String({ minLength: 1 }),
          }),
        }
      )
  )
