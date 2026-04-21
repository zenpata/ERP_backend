import { and, count, eq, ilike } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { employees } from '../../../hr/hr.schema'
import { pmProgressTasks } from '../../pm.schema'

export type ProgressListItem = {
  id: string
  title: string
  module: string
  phase: string
  status: string
  priority: string
  progressPct: number
  startDate: string
  targetDate: string
  assigneeName: string
}

const DELETABLE = ['Not Started', 'Cancelled']

function mapRow(
  row: typeof pmProgressTasks.$inferSelect,
  assigneeName: string
): ProgressListItem {
  return {
    id: row.id,
    title: row.title,
    module: row.module,
    phase: row.phase,
    status: row.status,
    priority: row.priority,
    progressPct: row.progressPct,
    startDate: String(row.startDate),
    targetDate: String(row.targetDate),
    assigneeName,
  }
}

async function nextTaskCode(): Promise<string> {
  const [r] = await db.select({ count: count() }).from(pmProgressTasks)
  const n = Number(r?.count ?? 0) + 1
  return `TSK-${String(n).padStart(3, '0')}`
}

export type ProgressSummaryResponse = {
  byModule: { module: string; avgProgress: number; taskCount: number; doneCount: number }[]
  overall: { avgProgress: number; taskCount: number; doneCount: number }
}

export const ProgressService = {
  async list(query: {
    page?: number
    perPage?: number
    module?: string
    phase?: string
    status?: string
    priority?: string
    assignee?: string
    search?: string
  }): Promise<PaginatedResult<ProgressListItem>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage
    const conditions = []
    if (query.module) conditions.push(eq(pmProgressTasks.module, query.module))
    if (query.phase) conditions.push(eq(pmProgressTasks.phase, query.phase))
    if (query.status) conditions.push(eq(pmProgressTasks.status, query.status))
    if (query.priority) conditions.push(eq(pmProgressTasks.priority, query.priority))
    if (query.assignee) {
      conditions.push(eq(pmProgressTasks.assigneeEmployeeId, query.assignee))
    }
    if (query.search) {
      conditions.push(ilike(pmProgressTasks.title, `%${query.search}%`))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const base = db
      .select({
        task: pmProgressTasks,
        fn: employees.firstnameTh,
        ln: employees.lastnameTh,
      })
      .from(pmProgressTasks)
      .leftJoin(employees, eq(pmProgressTasks.assigneeEmployeeId, employees.id))
      .where(where)

    const [rows, totalResult] = await Promise.all([
      base.limit(perPage).offset(offset),
      db.select({ count: count() }).from(pmProgressTasks).where(where),
    ])
    const total = Number(totalResult[0]?.count ?? 0)

    const data = rows.map((r) =>
      mapRow(r.task, r.fn && r.ln ? `${r.fn} ${r.ln}`.trim() : '-')
    )

    return {
      data,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    }
  },

  /**
   * Dynamic grouping: one entry per distinct `module` value that appears on at least one task.
   * Per module: avgProgress = round(sum(progressPct) / taskCount). Modules with no tasks are omitted.
   */
  async summary(module?: string): Promise<ProgressSummaryResponse> {
    const conditions = []
    if (module) conditions.push(eq(pmProgressTasks.module, module))
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db.select().from(pmProgressTasks).where(where)
    const byModule = new Map<string, { sumPct: number; n: number; done: number }>()
    let totalPct = 0
    let totalDone = 0
    for (const t of rows) {
      totalPct += t.progressPct
      if (t.status === 'Done') totalDone += 1
      const cur = byModule.get(t.module) ?? { sumPct: 0, n: 0, done: 0 }
      cur.sumPct += t.progressPct
      cur.n += 1
      if (t.status === 'Done') cur.done += 1
      byModule.set(t.module, cur)
    }
    const n = rows.length
    const moduleRows = [...byModule.entries()]
      .map(([mod, v]) => ({
        module: mod,
        avgProgress: v.n > 0 ? Math.round(v.sumPct / v.n) : 0,
        taskCount: v.n,
        doneCount: v.done,
      }))
      .sort((a, b) => a.module.localeCompare(b.module))
    return {
      byModule: moduleRows,
      overall: {
        avgProgress: n > 0 ? Math.round(totalPct / n) : 0,
        taskCount: n,
        doneCount: totalDone,
      },
    }
  },

  async getById(id: string): Promise<ProgressListItem> {
    const [row] = await db
      .select({
        task: pmProgressTasks,
        fn: employees.firstnameTh,
        ln: employees.lastnameTh,
      })
      .from(pmProgressTasks)
      .leftJoin(employees, eq(pmProgressTasks.assigneeEmployeeId, employees.id))
      .where(eq(pmProgressTasks.id, id))
      .limit(1)
    if (!row) throw new NotFoundError('task')
    return mapRow(
      row.task,
      row.fn && row.ln ? `${row.fn} ${row.ln}`.trim() : '-'
    )
  },

  async create(body: {
    title: string
    module: string
    phase: string
    status: string
    priority: string
    progressPct?: number
    startDate: string
    targetDate: string
    assigneeEmployeeId?: string
    note?: string
  }): Promise<ProgressListItem> {
    const code = await nextTaskCode()
    const [created] = await db
      .insert(pmProgressTasks)
      .values({
        taskCode: code,
        title: body.title,
        module: body.module,
        phase: body.phase,
        status: body.status,
        priority: body.priority,
        progressPct: body.progressPct ?? 0,
        startDate: body.startDate,
        targetDate: body.targetDate,
        assigneeEmployeeId: body.assigneeEmployeeId ?? null,
        note: body.note ?? null,
      })
      .returning()
    if (!created) throw new ValidationError({ task: ['สร้างงานไม่สำเร็จ'] })
    return ProgressService.getById(created.id)
  },

  async update(
    id: string,
    body: Partial<{
      title: string
      module: string
      phase: string
      status: string
      priority: string
      progressPct: number
      startDate: string
      targetDate: string
      assigneeEmployeeId: string
      note: string
    }>
  ): Promise<ProgressListItem> {
    const row = await db.query.pmProgressTasks.findFirst({
      where: eq(pmProgressTasks.id, id),
    })
    if (!row) throw new NotFoundError('task')
    const [updated] = await db
      .update(pmProgressTasks)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(pmProgressTasks.id, id))
      .returning()
    if (!updated) throw new NotFoundError('task')
    return ProgressService.getById(id)
  },

  async patchStatus(id: string, status: string, note?: string): Promise<ProgressListItem> {
    const row = await db.query.pmProgressTasks.findFirst({
      where: eq(pmProgressTasks.id, id),
    })
    if (!row) throw new NotFoundError('task')
    if (status === 'On Hold' && !note?.trim()) {
      throw new ValidationError({ note: ['ต้องระบุหมายเหตุเมื่อ On Hold'] })
    }
    const endDate =
      status === 'Done'
        ? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
        : row.actualEndDate
    const [updated] = await db
      .update(pmProgressTasks)
      .set({
        status,
        note: note ?? row.note,
        actualEndDate: status === 'Done' ? endDate : row.actualEndDate,
        updatedAt: new Date(),
      })
      .where(eq(pmProgressTasks.id, id))
      .returning()
    if (!updated) throw new NotFoundError('task')
    return ProgressService.getById(id)
  },

  async patchProgressPct(id: string, progressPct: number): Promise<ProgressListItem> {
    if (progressPct < 0 || progressPct > 100) {
      throw new ValidationError({ progressPct: ['ต้องอยู่ระหว่าง 0–100'] })
    }
    await db
      .update(pmProgressTasks)
      .set({ progressPct, updatedAt: new Date() })
      .where(eq(pmProgressTasks.id, id))
    return ProgressService.getById(id)
  },

  async remove(id: string): Promise<void> {
    const row = await db.query.pmProgressTasks.findFirst({
      where: eq(pmProgressTasks.id, id),
    })
    if (!row) throw new NotFoundError('task')
    if (!DELETABLE.includes(row.status)) {
      throw new ValidationError({ status: ['ลบได้เฉพาะ Not Started หรือ Cancelled'] })
    }
    await db.delete(pmProgressTasks).where(eq(pmProgressTasks.id, id))
  },
}
