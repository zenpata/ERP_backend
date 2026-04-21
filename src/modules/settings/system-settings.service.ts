import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '../../shared/db/client'
import { NotFoundError, ValidationError } from '../../shared/middleware/error.middleware'
import { AuditLogService } from './audit-log.service'
import { companySettings, fiscalPeriods, notificationConfigs } from './settings.schema'

export type CompanySettingsApi = {
  id: string
  companyName: string
  companyNameEn?: string
  taxId?: string
  logoUrl?: string
  currency: string
  defaultVatRate: number
  invoicePrefix?: string
  address?: string
  phone?: string
}

export type FiscalPeriodApi = {
  id: string
  year: number
  month: number
  startDate: string
  endDate: string
  status: 'open' | 'closed'
  closedAt?: string
  closedBy?: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function monthDateRangeUtc(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    start: `${year}-${pad2(month)}-01`,
    end: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  }
}

function companyRowToApi(row: typeof companySettings.$inferSelect): CompanySettingsApi {
  const base: CompanySettingsApi = {
    id: row.id,
    companyName: row.companyName,
    currency: row.currency,
    defaultVatRate: Number(row.defaultVatRate),
  }
  if (row.companyNameEn != null) base.companyNameEn = row.companyNameEn
  if (row.taxId != null) base.taxId = row.taxId
  if (row.logoUrl != null) base.logoUrl = row.logoUrl
  if (row.invoicePrefix != null) base.invoicePrefix = row.invoicePrefix
  if (row.address != null) base.address = row.address
  if (row.phone != null) base.phone = row.phone
  return base
}

function formatPgDate(d: string | Date): string {
  if (typeof d === 'string') return d.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function fiscalRowToApi(row: typeof fiscalPeriods.$inferSelect): FiscalPeriodApi {
  const base: FiscalPeriodApi = {
    id: row.id,
    year: row.year,
    month: row.month,
    startDate: formatPgDate(row.startDate as string | Date),
    endDate: formatPgDate(row.endDate as string | Date),
    status: row.status === 'closed' ? 'closed' : 'open',
  }
  if (row.closedAt != null) base.closedAt = row.closedAt.toISOString()
  if (row.closedBy != null) base.closedBy = row.closedBy
  return base
}

async function getCompanyRow() {
  const [row] = await db.select().from(companySettings).limit(1)
  if (row) return row
  await db.insert(companySettings).values({ companyName: '' })
  const [created] = await db.select().from(companySettings).limit(1)
  if (!created) throw new Error('company_settings bootstrap failed')
  return created
}

export const SystemSettingsService = {
  async getCompany(): Promise<CompanySettingsApi> {
    const row = await getCompanyRow()
    return companyRowToApi(row)
  },

  async updateCompany(
    body: Partial<{
      companyName: string
      companyNameEn: string
      taxId: string
      currency: string
      defaultVatRate: number
      invoicePrefix: string
      address: string
      phone: string
    }>,
    actorUserId: string
  ): Promise<CompanySettingsApi> {
    if (body.defaultVatRate != null && (body.defaultVatRate < 0 || body.defaultVatRate > 100)) {
      throw new ValidationError({ defaultVatRate: ['Must be between 0 and 100'] })
    }
    const hasAny =
      body.companyName != null ||
      body.companyNameEn !== undefined ||
      body.taxId !== undefined ||
      body.currency != null ||
      body.defaultVatRate != null ||
      body.invoicePrefix !== undefined ||
      body.address !== undefined ||
      body.phone !== undefined
    if (!hasAny) throw new ValidationError({ _: ['No fields to update'] })
    const current = await getCompanyRow()
    const [updated] = await db
      .update(companySettings)
      .set({
        ...(body.companyName != null ? { companyName: body.companyName } : {}),
        ...(body.companyNameEn !== undefined ? { companyNameEn: body.companyNameEn || null } : {}),
        ...(body.taxId !== undefined ? { taxId: body.taxId || null } : {}),
        ...(body.currency != null ? { currency: body.currency } : {}),
        ...(body.defaultVatRate != null ? { defaultVatRate: String(body.defaultVatRate) } : {}),
        ...(body.invoicePrefix !== undefined ? { invoicePrefix: body.invoicePrefix || null } : {}),
        ...(body.address !== undefined ? { address: body.address || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(companySettings.id, current.id))
      .returning()
    if (!updated) throw new ValidationError({ _: ['Update failed'] })

    await AuditLogService.append({
      actorUserId: actorUserId,
      entityType: 'company_settings',
      entityId: updated.id,
      action: 'update',
      metadata: { beforeId: current.id },
    })

    return companyRowToApi(updated)
  },

  async setCompanyLogoUrl(logoUrl: string, actorUserId: string): Promise<CompanySettingsApi> {
    if (!logoUrl?.trim()) throw new ValidationError({ logoUrl: ['Required'] })
    const current = await getCompanyRow()
    const [updated] = await db
      .update(companySettings)
      .set({ logoUrl: logoUrl.trim(), updatedAt: new Date() })
      .where(eq(companySettings.id, current.id))
      .returning()
    if (!updated) throw new ValidationError({ _: ['Update failed'] })
    await AuditLogService.append({
      actorUserId: actorUserId,
      entityType: 'company_settings',
      entityId: updated.id,
      action: 'logo_update',
      metadata: {},
    })
    return companyRowToApi(updated)
  },

  async listFiscalPeriods(): Promise<FiscalPeriodApi[]> {
    const rows = await db
      .select()
      .from(fiscalPeriods)
      .orderBy(desc(fiscalPeriods.year), desc(fiscalPeriods.month))
    return rows.map(fiscalRowToApi)
  },

  async getCurrentFiscalPeriod(): Promise<FiscalPeriodApi | null> {
    const d = new Date()
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth() + 1
    const [row] = await db
      .select()
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.year, year), eq(fiscalPeriods.month, month)))
      .limit(1)
    return row ? fiscalRowToApi(row) : null
  },

  async generateFiscalYear(year: number, actorUserId: string): Promise<FiscalPeriodApi[]> {
    if (year < 2000 || year > 2100) throw new ValidationError({ year: ['Invalid year'] })
    for (let m = 1; m <= 12; m++) {
      const { start, end } = monthDateRangeUtc(year, m)
      await db
        .insert(fiscalPeriods)
        .values({
          year,
          month: m,
          startDate: start,
          endDate: end,
          status: 'open',
        })
        .onConflictDoNothing({ target: [fiscalPeriods.year, fiscalPeriods.month] })
    }
    await AuditLogService.append({
      actorUserId: actorUserId,
      entityType: 'fiscal_period',
      entityId: null,
      action: 'generate_year',
      metadata: { year },
    })
    const rows = await db
      .select()
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.year, year))
      .orderBy(asc(fiscalPeriods.month))
    return rows.map(fiscalRowToApi)
  },

  async closeFiscalPeriod(id: string, actorUserId: string): Promise<FiscalPeriodApi> {
    const [row] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, id)).limit(1)
    if (!row) throw new NotFoundError('fiscal period')
    if (row.status === 'closed') return fiscalRowToApi(row)
    const [updated] = await db
      .update(fiscalPeriods)
      .set({
        status: 'closed',
        closedAt: new Date(),
        closedBy: actorUserId,
      })
      .where(eq(fiscalPeriods.id, id))
      .returning()
    if (!updated) throw new ValidationError({ _: ['Close failed'] })
    await AuditLogService.append({
      actorUserId: actorUserId,
      entityType: 'fiscal_period',
      entityId: id,
      action: 'close',
      metadata: { year: row.year, month: row.month },
    })
    return fiscalRowToApi(updated)
  },

  async reopenFiscalPeriod(id: string, actorUserId: string): Promise<FiscalPeriodApi> {
    const [row] = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, id)).limit(1)
    if (!row) throw new NotFoundError('fiscal period')
    const [updated] = await db
      .update(fiscalPeriods)
      .set({
        status: 'open',
        closedAt: null,
        closedBy: null,
      })
      .where(eq(fiscalPeriods.id, id))
      .returning()
    if (!updated) throw new ValidationError({ _: ['Reopen failed'] })
    await AuditLogService.append({
      actorUserId: actorUserId,
      entityType: 'fiscal_period',
      entityId: id,
      action: 'reopen',
      metadata: { year: row.year, month: row.month },
    })
    return fiscalRowToApi(updated)
  },

  async getNotificationConfigs(): Promise<Record<string, unknown>> {
    const rows = await db.select().from(notificationConfigs)
    const out: Record<string, unknown> = {}
    for (const r of rows) {
      out[r.key] = r.value as unknown
    }
    return out
  },

  async putNotificationConfigs(
    body: Record<string, unknown>,
    actorUserId: string
  ): Promise<Record<string, unknown>> {
    const keys = Object.keys(body)
    if (!keys.length) throw new ValidationError({ _: ['Empty body'] })
    for (const key of keys) {
      const value = body[key]
      const asJson = value === undefined ? {} : value
      const [existing] = await db
        .select()
        .from(notificationConfigs)
        .where(eq(notificationConfigs.key, key))
        .limit(1)
      if (existing) {
        await db
          .update(notificationConfigs)
          .set({ value: asJson as object, updatedAt: new Date() })
          .where(eq(notificationConfigs.key, key))
      } else {
        await db.insert(notificationConfigs).values({
          key,
          value: asJson as object,
          updatedAt: new Date(),
        })
      }
    }
    await AuditLogService.append({
      actorUserId: actorUserId,
      entityType: 'notification_config',
      entityId: null,
      action: 'update',
      metadata: { keys },
    })
    return SystemSettingsService.getNotificationConfigs()
  },
}
