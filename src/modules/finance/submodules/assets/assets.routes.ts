import { Elysia, t } from 'elysia'
import { AssetsService, type CreateFixedAssetInput } from './assets.service'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'

export const assetsRoutes = new Elysia({ prefix: '/fixed-assets' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:asset:view'))
      .get('/', async ({ query }) => {
        const filter: { status?: string; category?: string } = {}
        if (query.status) filter.status = query.status
        if (query.category) filter.category = query.category
        const assets = await AssetsService.listAssets(filter)
        return { success: true, data: assets }
      }, {
        query: t.Object({
          status: t.Optional(t.String()),
          category: t.Optional(t.String()),
        }),
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:asset:create'))
      .post('/', async ({ body, user }) => {
        const asset = await AssetsService.createAsset(body as CreateFixedAssetInput, (user as any).userId)
        return { success: true, data: asset }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:asset:view'))
      .get('/:id', async ({ params }) => {
        const asset = await AssetsService.getAsset(params.id)
        if (!asset) return { success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }
        return { success: true, data: asset }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:asset:edit'))
      .patch('/:id', async ({ params, body, user }) => {
        const asset = await AssetsService.updateAsset(
          params.id,
          body as Partial<CreateFixedAssetInput>,
          (user as any).userId
        )
        return { success: true, data: asset }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:asset:view'))
      .get('/:id/schedule', async ({ params }) => {
        const schedule = await AssetsService.getDepreciationSchedule(params.id)
        return { success: true, data: schedule }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:asset:edit'))
      .post('/:id/dispose', async ({ params, body, user }) => {
        const result = await AssetsService.disposeAsset(
          params.id,
          (body as any).disposalDate,
          (body as any).proceedsAmount,
          (user as any).userId
        )
        return { success: true, data: result }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:report:view'))
      .get('/reports/asset-register', async ({ query }) => {
        const assets = await AssetsService.listAssets({
          status: (query.status as string) || 'active',
        })
        return { success: true, data: assets }
      }, {
        query: t.Object({
          status: t.Optional(t.String()),
        }),
      })
  )
