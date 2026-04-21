import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../../shared/db/client'
import type { PaginatedResult } from '../../shared/types/common.types'
import { auditLogs } from './settings.schema'

export type AuditLogApi = {
  id: string
  occurredAt: string
  actorUserId?: string
  entityType: string
  entityId?: string
  action: string
  metadata?: Record<string, unknown>
}

function rowToApi(r: typeof auditLogs.$inferSelect): AuditLogApi {
  const base: AuditLogApi = {
    id: r.id,
    occurredAt: r.occurredAt.toISOString(),
    entityType: r.entityType,
    action: r.action,
  }
  if (r.actorUserId != null) base.actorUserId = r.actorUserId
  if (r.entityId != null) base.entityId = r.entityId
  if (r.metadata != null && typeof r.metadata === 'object' && !Array.isArray(r.metadata)) {
    base.metadata = r.metadata as Record<string, unknown>
  }
  return base
}

export const AuditLogService = {
  async append(input: {
    actorUserId?: string | null
    entityType: string
    entityId?: string | null
    action: string
    metadata?: Record<string, unknown> | null
  }): Promise<void> {
    await db.insert(auditLogs).values({
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      action: input.action,
      metadata: input.metadata ?? null,
    })
  },

  async list(query: {
    page?: number
    perPage?: number
    entityType?: string
    entityId?: string
  }): Promise<PaginatedResult<AuditLogApi>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = []
    if (query.entityType) conditions.push(eq(auditLogs.entityType, query.entityType))
    if (query.entityId) conditions.push(eq(auditLogs.entityId, query.entityId))
    const whereClause = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db.select({ c: count() }).from(auditLogs).where(whereClause)

    const total = Number(countRow?.c ?? 0)
    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.occurredAt))
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

  async listByEntity(entityType: string, entityId: string): Promise<AuditLogApi[]> {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.occurredAt))
      .limit(200)
    return rows.map(rowToApi)
  },
}
