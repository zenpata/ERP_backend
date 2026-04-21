import { Elysia, t } from 'elysia'
import { ProgressService } from './progress.service'

export const progressRoutes = new Elysia({ prefix: '/progress' }).get(
    '/summary',
    async ({ query }) => {
      const data = await ProgressService.summary(query.module)
      return { success: true, data }
    },
    {
      query: t.Object({
        module: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/',
    async ({ query }) => {
      const q: Parameters<typeof ProgressService.list>[0] = {}
      if (query.page !== undefined) q.page = query.page
      if (query.perPage !== undefined) q.perPage = query.perPage
      if (query.module !== undefined) q.module = query.module
      if (query.phase !== undefined) q.phase = query.phase
      if (query.status !== undefined) q.status = query.status
      if (query.priority !== undefined) q.priority = query.priority
      if (query.assignee !== undefined) q.assignee = query.assignee
      if (query.search !== undefined) q.search = query.search
      const result = await ProgressService.list(q)
      return { success: true, data: result.data, meta: result.meta }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
        module: t.Optional(t.String()),
        phase: t.Optional(t.String()),
        status: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        assignee: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/',
    async ({ body }) => {
      const row = await ProgressService.create(body)
      return { success: true, data: row }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        module: t.String(),
        phase: t.String(),
        status: t.String(),
        priority: t.String(),
        progressPct: t.Optional(t.Numeric({ minimum: 0, maximum: 100 })),
        startDate: t.String({ format: 'date' }),
        targetDate: t.String({ format: 'date' }),
        assigneeEmployeeId: t.Optional(t.String()),
        note: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/:id',
    async ({ params }) => {
      const data = await ProgressService.getById(params.id)
      return { success: true, data }
    },
    { params: t.Object({ id: t.String() }) }
  )
  .put(
    '/:id',
    async ({ params, body }) => {
      const patch: Parameters<typeof ProgressService.update>[1] = {}
      if (body.title !== undefined) patch.title = body.title
      if (body.module !== undefined) patch.module = body.module
      if (body.phase !== undefined) patch.phase = body.phase
      if (body.status !== undefined) patch.status = body.status
      if (body.priority !== undefined) patch.priority = body.priority
      if (body.progressPct !== undefined) patch.progressPct = Number(body.progressPct)
      if (body.startDate !== undefined) patch.startDate = body.startDate
      if (body.targetDate !== undefined) patch.targetDate = body.targetDate
      if (body.assigneeEmployeeId !== undefined) patch.assigneeEmployeeId = body.assigneeEmployeeId
      if (body.note !== undefined) patch.note = body.note
      const row = await ProgressService.update(params.id, patch)
      return { success: true, data: row }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        module: t.Optional(t.String()),
        phase: t.Optional(t.String()),
        status: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        progressPct: t.Optional(t.Numeric({ minimum: 0, maximum: 100 })),
        startDate: t.Optional(t.String({ format: 'date' })),
        targetDate: t.Optional(t.String({ format: 'date' })),
        assigneeEmployeeId: t.Optional(t.String()),
        note: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/:id/status',
    async ({ params, body }) => {
      const row = await ProgressService.patchStatus(params.id, body.status, body.note)
      return { success: true, data: row }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.String(),
        note: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/:id/progress',
    async ({ params, body }) => {
      const row = await ProgressService.patchProgressPct(params.id, body.progressPct)
      return { success: true, data: row }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        progressPct: t.Numeric({ minimum: 0, maximum: 100 }),
      }),
    }
  )
  .delete(
    '/:id',
    async ({ params }) => {
      await ProgressService.remove(params.id)
      return { success: true, data: null }
    },
    { params: t.Object({ id: t.String() }) }
  )
