import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../shared/middleware/auth.middleware'
import { requireAnyPermission } from '../../shared/middleware/rbac.middleware'
import { AuditLogService } from './audit-log.service'
import { SystemSettingsService } from './system-settings.service'

const companyPutBody = t.Object({
  companyName: t.Optional(t.String()),
  companyNameEn: t.Optional(t.String()),
  taxId: t.Optional(t.String()),
  currency: t.Optional(t.String()),
  defaultVatRate: t.Optional(t.Numeric({ minimum: 0, maximum: 100 })),
  invoicePrefix: t.Optional(t.String()),
  address: t.Optional(t.String()),
  phone: t.Optional(t.String()),
})

const logoBody = t.Object({
  logoUrl: t.String({ minLength: 1 }),
})

const fiscalGenerateBody = t.Object({
  year: t.Numeric({ minimum: 2000, maximum: 2100 }),
})

export const settingsModuleRoutes = new Elysia({ prefix: '/settings' })
  .use(
    new Elysia()
      .use(requireAnyPermission('system:settings:view'))
      .get('/company', async () => {
        const data = await SystemSettingsService.getCompany()
        return { success: true, data }
      })
      .get('/fiscal-periods', async () => {
        const data = await SystemSettingsService.listFiscalPeriods()
        return { success: true, data }
      })
      .get('/fiscal-periods/current', async () => {
        const data = await SystemSettingsService.getCurrentFiscalPeriod()
        return { success: true, data }
      })
      .get(
        '/audit-logs/:entityType/:entityId',
        async ({ params }) => {
          const data = await AuditLogService.listByEntity(params.entityType, params.entityId)
          return { success: true, data }
        },
        { params: t.Object({ entityType: t.String(), entityId: t.String({ format: 'uuid' }) }) }
      )
      .get(
        '/audit-logs',
        async ({ query }) => {
          const listOpts: {
            page?: number
            perPage?: number
            entityType?: string
            entityId?: string
          } = {}
          if (query.page != null) listOpts.page = Number(query.page)
          if (query.perPage != null) listOpts.perPage = Number(query.perPage)
          if (query.entityType != null) listOpts.entityType = query.entityType
          if (query.entityId != null) listOpts.entityId = query.entityId
          const result = await AuditLogService.list(listOpts)
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
            entityType: t.Optional(t.String()),
            entityId: t.Optional(t.String()),
          }),
        }
      )
      .get('/notification-configs', async () => {
        const data = await SystemSettingsService.getNotificationConfigs()
        return { success: true, data }
      })
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('system:settings:manage'))
      .put(
        '/company',
        async (ctx) => {
          const { user, body } = ctx as typeof ctx & { user: AuthContextUser; body: typeof companyPutBody.static }
          const data = await SystemSettingsService.updateCompany(
            {
              ...(body.companyName != null ? { companyName: body.companyName } : {}),
              ...(body.companyNameEn !== undefined ? { companyNameEn: body.companyNameEn } : {}),
              ...(body.taxId !== undefined ? { taxId: body.taxId } : {}),
              ...(body.currency != null ? { currency: body.currency } : {}),
              ...(body.defaultVatRate != null ? { defaultVatRate: Number(body.defaultVatRate) } : {}),
              ...(body.invoicePrefix !== undefined ? { invoicePrefix: body.invoicePrefix } : {}),
              ...(body.address !== undefined ? { address: body.address } : {}),
              ...(body.phone !== undefined ? { phone: body.phone } : {}),
            },
            user.userId
          )
          return { success: true, data }
        },
        { body: companyPutBody }
      )
      .post(
        '/company/logo',
        async (ctx) => {
          const { user, body } = ctx as typeof ctx & { user: AuthContextUser; body: typeof logoBody.static }
          const data = await SystemSettingsService.setCompanyLogoUrl(body.logoUrl, user.userId)
          return { success: true, data }
        },
        { body: logoBody }
      )
      .post(
        '/fiscal-periods/generate',
        async (ctx) => {
          const { user, body } = ctx as typeof ctx & { user: AuthContextUser; body: typeof fiscalGenerateBody.static }
          const data = await SystemSettingsService.generateFiscalYear(Number(body.year), user.userId)
          return { success: true, data }
        },
        { body: fiscalGenerateBody }
      )
      .patch(
        '/fiscal-periods/:id/close',
        async (ctx) => {
          const { user, params } = ctx as typeof ctx & { user: AuthContextUser; params: { id: string } }
          const data = await SystemSettingsService.closeFiscalPeriod(params.id, user.userId)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
      .patch(
        '/fiscal-periods/:id/reopen',
        async (ctx) => {
          const { user, params } = ctx as typeof ctx & { user: AuthContextUser; params: { id: string } }
          const data = await SystemSettingsService.reopenFiscalPeriod(params.id, user.userId)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
      .put(
        '/notification-configs',
        async (ctx) => {
          const { user, body } = ctx as typeof ctx & { user: AuthContextUser; body: Record<string, unknown> }
          const data = await SystemSettingsService.putNotificationConfigs(body, user.userId)
          return { success: true, data }
        },
        {
          body: t.Object(
            {},
            {
              additionalProperties: true,
            }
          ),
        }
      )
  )
