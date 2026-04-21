import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../../shared/db/client'
import { NotFoundError, ValidationError } from '../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../shared/types/common.types'
import { inAppNotifications } from './settings.schema'

export type InAppNotificationApi = {
  id: string
  title: string
  body?: string
  readAt?: string
  entityType?: string
  entityId?: string
  createdAt: string
}

function rowToApi(r: typeof inAppNotifications.$inferSelect): InAppNotificationApi {
  const base: InAppNotificationApi = {
    id: r.id,
    title: r.title,
    createdAt: r.createdAt.toISOString(),
  }
  if (r.body != null) base.body = r.body
  if (r.readAt != null) base.readAt = r.readAt.toISOString()
  if (r.entityType != null) base.entityType = r.entityType
  if (r.entityId != null) base.entityId = r.entityId
  return base
}

export const InAppNotificationService = {
  async listForUser(
    userId: string,
    query: { page?: number; perPage?: number; unreadOnly?: boolean }
  ): Promise<PaginatedResult<InAppNotificationApi>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = [eq(inAppNotifications.userId, userId)]
    if (query.unreadOnly) conditions.push(isNull(inAppNotifications.readAt))
    const whereClause = and(...conditions)

    const [countRow] = await db.select({ c: count() }).from(inAppNotifications).where(whereClause)

    const total = Number(countRow?.c ?? 0)
    const rows = await db
      .select()
      .from(inAppNotifications)
      .where(whereClause)
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(perPage)
      .offset(offset)

    return {
      data: rows.map(rowToApi),
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  },

  async unreadCount(userId: string): Promise<number> {
    const [r] = await db
      .select({ c: count() })
      .from(inAppNotifications)
      .where(and(eq(inAppNotifications.userId, userId), isNull(inAppNotifications.readAt)))
    return Number(r?.c ?? 0)
  },

  async markRead(userId: string, notificationId: string): Promise<InAppNotificationApi> {
    const [row] = await db
      .select()
      .from(inAppNotifications)
      .where(and(eq(inAppNotifications.id, notificationId), eq(inAppNotifications.userId, userId)))
      .limit(1)
    if (!row) throw new NotFoundError('notification')

    const [updated] = await db
      .update(inAppNotifications)
      .set({ readAt: new Date() })
      .where(eq(inAppNotifications.id, notificationId))
      .returning()
    if (!updated) throw new ValidationError({ _: ['Update failed'] })
    return rowToApi(updated)
  },

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const rows = await db
      .update(inAppNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(inAppNotifications.userId, userId), isNull(inAppNotifications.readAt)))
      .returning({ id: inAppNotifications.id })
    return { updated: rows.length }
  },
}
