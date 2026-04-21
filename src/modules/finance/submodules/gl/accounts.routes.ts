import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { AccountsService } from './accounts.service'

export const accountsRoutes = new Elysia({ prefix: '/accounts' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:account:view', 'finance:journal:view'))
      .get(
        '/',
        async ({ query }) => {
          await AccountsService.seedDefaultsIfEmpty()
          let isActive: boolean | undefined
          if (query.isActive === 'true') isActive = true
          else if (query.isActive === 'false') isActive = false
          else isActive = undefined
          const listParams: { search?: string; isActive?: boolean } = {}
          if (query.search !== undefined && query.search.trim() !== '') {
            listParams.search = query.search
          }
          if (isActive !== undefined) {
            listParams.isActive = isActive
          }
          const data = await AccountsService.list(listParams)
          return { success: true, data }
        },
        {
          query: t.Object({
            search: t.Optional(t.String()),
            isActive: t.Optional(t.String()),
          }),
        }
      )
      .get('/:id', async ({ params }) => {
        const row = await AccountsService.getById(params.id)
        if (!row) return { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } }
        return { success: true, data: row }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:account:create'))
      .post(
        '/',
        async ({ body }) => {
          const data = await AccountsService.create(body)
          return { success: true, data }
        },
        {
          body: t.Object({
            code: t.String({ minLength: 1 }),
            name: t.String({ minLength: 1 }),
            type: t.String({ minLength: 1 }),
            parentId: t.Optional(t.Nullable(t.String())),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:account:edit'))
      .patch(
        '/:id/activate',
        async ({ params, body }) => {
          const data = await AccountsService.setActive(params.id, body.isActive)
          if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } }
          return { success: true, data }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({ isActive: t.Boolean() }),
        }
      )
      .patch(
        '/:id',
        async ({ params, body }) => {
          const data = await AccountsService.patch(params.id, body)
          if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } }
          return { success: true, data }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            name: t.Optional(t.String()),
            type: t.Optional(t.String()),
            parentId: t.Optional(t.Nullable(t.String())),
            isActive: t.Optional(t.Boolean()),
          }),
        }
      )
  )
