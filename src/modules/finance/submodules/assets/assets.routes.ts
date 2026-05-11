import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../../../shared/middleware/auth.middleware'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { AssetsService, type CreateFixedAssetInput } from './assets.service'

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
      .post('/', async ({ body, user, set }) => {
        const { userId } = user as AuthContextUser
        const asset = await AssetsService.createAsset({
          assetNo: body.assetNo,
          name: body.name,
          category: body.category,
          acquisitionDate: body.acquisitionDate,
          cost: body.cost,
          salvageValue: body.salvageValue,
          usefulLifeMonths: Number(body.usefulLifeMonths),
          depreciationMethod: body.depreciationMethod as 'straight_line' | 'declining_balance' | undefined,
          assetAccountId: body.assetAccountId,
          accumDepAccountId: body.accumDepAccountId,
          depExpenseAccountId: body.depExpenseAccountId,
          notes: body.notes,
        }, userId)
        set.status = 201
        return { success: true, data: asset }
      }, {
        body: t.Object({
          assetNo: t.Optional(t.String()),
          name: t.String({ minLength: 1 }),
          category: t.Optional(t.String()),
          acquisitionDate: t.String({ minLength: 1 }),
          cost: t.String({ minLength: 1 }),
          salvageValue: t.Optional(t.String()),
          usefulLifeMonths: t.Numeric({ minimum: 1 }),
          depreciationMethod: t.Optional(t.String()),
          assetAccountId: t.String({ minLength: 1 }),
          accumDepAccountId: t.String({ minLength: 1 }),
          depExpenseAccountId: t.String({ minLength: 1 }),
          notes: t.Optional(t.String()),
        }),
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
        const { userId } = user as AuthContextUser
        const asset = await AssetsService.updateAsset(
          params.id,
          body as Partial<CreateFixedAssetInput>,
          userId
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
        const { userId } = user as AuthContextUser
        const result = await AssetsService.disposeAsset(
          params.id,
          body.disposalDate,
          body.proceedsAmount,
          userId
        )
        return { success: true, data: result }
      }, {
        body: t.Object({
          disposalDate: t.String({ minLength: 1 }),
          proceedsAmount: t.Optional(t.String()),
        }),
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
