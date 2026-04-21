import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../shared/middleware/auth.middleware'
import { InAppNotificationService } from './in-app-notification.service'

export const notificationsRoutes = new Elysia({ prefix: '/notifications' }).get(
    '/',
    async (ctx) => {
      const { user, query } = ctx as typeof ctx & {
        user: AuthContextUser
        query: { page?: number; perPage?: number; unreadOnly?: string }
      }
      const listOpts: { page?: number; perPage?: number; unreadOnly?: boolean } = {}
      if (query.page != null) listOpts.page = Number(query.page)
      if (query.perPage != null) listOpts.perPage = Number(query.perPage)
      listOpts.unreadOnly = query.unreadOnly === 'true' || query.unreadOnly === '1'
      const result = await InAppNotificationService.listForUser(user.userId, listOpts)
      return { success: true, data: result.data, meta: result.meta }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
        unreadOnly: t.Optional(t.String()),
      }),
    }
  )
  .get('/unread-count', async (ctx) => {
    const { user } = ctx as typeof ctx & { user: AuthContextUser }
    const count = await InAppNotificationService.unreadCount(user.userId)
    return { success: true, data: { count } }
  })
  .patch(
    '/:id/read',
    async (ctx) => {
      const { user, params } = ctx as typeof ctx & { user: AuthContextUser; params: { id: string } }
      const data = await InAppNotificationService.markRead(user.userId, params.id)
      return { success: true, data }
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post('/mark-all-read', async (ctx) => {
    const { user } = ctx as typeof ctx & { user: AuthContextUser }
    const data = await InAppNotificationService.markAllRead(user.userId)
    return { success: true, data }
  })
