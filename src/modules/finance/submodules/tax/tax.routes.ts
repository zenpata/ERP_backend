import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../../../shared/middleware/auth.middleware'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { TaxService } from './tax.service'

const listRatesQuery = t.Object({
  type: t.Optional(t.Union([t.Literal('VAT'), t.Literal('WHT')])),
  isActive: t.Optional(t.Union([t.Literal('true'), t.Literal('false')])),
})

const vatSummaryQuery = t.Object({
  month: t.Numeric({ minimum: 1, maximum: 12 }),
  year: t.Numeric({ minimum: 2000, maximum: 2100 }),
})

const whtListQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  pndForm: t.Optional(t.String()),
  month: t.Optional(t.Numeric({ minimum: 1, maximum: 12 })),
  year: t.Optional(t.Numeric({ minimum: 2000, maximum: 2100 })),
  sourceModule: t.Optional(t.Union([t.Literal('ap'), t.Literal('payroll')])),
})

const pndQuery = t.Object({
  form: t.String(),
  month: t.Numeric({ minimum: 1, maximum: 12 }),
  year: t.Numeric({ minimum: 2000, maximum: 2100 }),
})

const vatExportQuery = t.Object({
  month: t.Numeric({ minimum: 1, maximum: 12 }),
  year: t.Numeric({ minimum: 2000, maximum: 2100 }),
  format: t.Optional(t.Union([t.Literal('pdf'), t.Literal('xlsx'), t.Literal('csv')])),
})

const pndExportQuery = t.Object({
  form: t.String(),
  month: t.Numeric({ minimum: 1, maximum: 12 }),
  year: t.Numeric({ minimum: 2000, maximum: 2100 }),
  format: t.Optional(t.Union([t.Literal('pdf'), t.Literal('xlsx'), t.Literal('csv')])),
})

export const taxRoutes = new Elysia({ prefix: '/tax' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:view'))
      .get(
        '/rates',
        async ({ query }) => {
          const q: Parameters<typeof TaxService.listRates>[0] = {}
          if (query.type !== undefined) q.type = query.type
          if (query.isActive === 'true') q.isActive = true
          else if (query.isActive === 'false') q.isActive = false
          const data = await TaxService.listRates(q)
          return { success: true, data }
        },
        { query: listRatesQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:view'))
      .get(
        '/vat-summary',
        async ({ query }) => {
          const data = await TaxService.vatSummary(Number(query.month), Number(query.year))
          return { success: true, data }
        },
        { query: vatSummaryQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:view'))
      .get(
        '/vat-summary/export',
        async ({ query, set }) => {
          const format = query.format ?? 'csv'
          const month = Number(query.month)
          const year = Number(query.year)
          if (format === 'pdf') {
            const summary = await TaxService.vatSummary(month, year)
            const lines = [
              'VAT summary (PP.30 basis)',
              `Period: ${summary.period}`,
              `Output VAT: ${summary.outputVat}`,
              `Input VAT: ${summary.inputVat}`,
              `Net payable: ${summary.netVatPayable}`,
              `Invoices: ${summary.invoiceCount}  AP bills: ${summary.apBillCount}`,
            ]
            const { buildAsciiPdf } = await import('./tax-pdf')
            const buf = buildAsciiPdf(lines)
            set.headers['Content-Type'] = 'application/pdf'
            set.headers['Content-Disposition'] = `attachment; filename="vat-${summary.period}.pdf"`
            return buf
          }
          const csv = await TaxService.vatSummaryExportCsv(month, year)
          set.headers['Content-Type'] = 'text/csv; charset=utf-8'
          set.headers['Content-Disposition'] = `attachment; filename="vat-${year}-${String(month).padStart(2, '0')}.csv"`
          return csv
        },
        { query: vatExportQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:view'))
      .get(
        '/wht-certificates',
        async ({ query }) => {
          const q: Parameters<typeof TaxService.listWhtCertificates>[0] = {}
          if (query.page !== undefined) q.page = Number(query.page)
          if (query.limit !== undefined) q.limit = Number(query.limit)
          if (query.pndForm !== undefined) q.pndForm = query.pndForm
          if (query.month !== undefined) q.month = Number(query.month)
          if (query.year !== undefined) q.year = Number(query.year)
          if (query.sourceModule !== undefined) q.sourceModule = query.sourceModule
          const result = await TaxService.listWhtCertificates(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        { query: whtListQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:view'))
      .get(
        '/wht-certificates/:id/pdf',
        async ({ params, set }) => {
          const buf = await TaxService.getWhtCertificatePdf(params.id)
          set.headers['Content-Type'] = 'application/pdf'
          set.headers['Content-Disposition'] = `attachment; filename="wht-${params.id}.pdf"`
          return buf
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:view'))
      .get(
        '/pnd-report',
        async ({ query }) => {
          const data = await TaxService.pndReport(query.form, Number(query.month), Number(query.year))
          return { success: true, data }
        },
        { query: pndQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:view'))
      .get(
        '/pnd-report/export',
        async ({ query, set }) => {
          const format = query.format ?? 'csv'
          const form = query.form
          const month = Number(query.month)
          const year = Number(query.year)
          if (format === 'pdf') {
            const rep = await TaxService.pndReport(form, month, year)
            const lines = [
              `PND ${rep.form} — ${rep.period}`,
              `Total base: ${rep.summary.totalBase}  Total WHT: ${rep.summary.totalWht}`,
              ...rep.lines.map(
                (l) =>
                  `${l.incomeType} | payees ${l.payeeCount} | base ${l.baseAmount} | wht ${l.whtAmount}`
              ),
            ]
            const { buildAsciiPdf } = await import('./tax-pdf')
            const buf = buildAsciiPdf(lines)
            set.headers['Content-Type'] = 'application/pdf'
            set.headers['Content-Disposition'] = `attachment; filename="pnd-${form}-${year}-${String(month).padStart(2, '0')}.pdf"`
            return buf
          }
          const csv = await TaxService.pndReportExportCsv(form, month, year)
          set.headers['Content-Type'] = 'text/csv; charset=utf-8'
          set.headers['Content-Disposition'] = `attachment; filename="pnd-${form}-${year}-${String(month).padStart(2, '0')}.csv"`
          return csv
        },
        { query: pndExportQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:manage'))
      .post(
        '/rates',
        async ({ body, set }) => {
          const data = await TaxService.createRate({
            type: body.type,
            code: body.code,
            rate: body.rate,
            description: body.description,
            pndForm: body.pndForm,
            incomeType: body.incomeType,
          })
          set.status = 201
          return { success: true, data, message: 'Created' }
        },
        {
          body: t.Object({
            type: t.Union([t.Literal('VAT'), t.Literal('WHT')]),
            code: t.String({ minLength: 1 }),
            rate: t.Number(),
            description: t.String({ minLength: 1 }),
            pndForm: t.Optional(t.String()),
            incomeType: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:manage'))
      .patch(
        '/rates/:id',
        async ({ params, body }) => {
          const data = await TaxService.patchRate(params.id, {
            ...(body.rate !== undefined ? { rate: body.rate } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.pndForm !== undefined ? { pndForm: body.pndForm } : {}),
            ...(body.incomeType !== undefined ? { incomeType: body.incomeType } : {}),
          })
          return { success: true, data, message: 'Updated' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            rate: t.Optional(t.Number()),
            description: t.Optional(t.String()),
            pndForm: t.Optional(t.String()),
            incomeType: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:manage'))
      .patch(
        '/rates/:id/activate',
        async ({ params, body }) => {
          const data = await TaxService.setRateActive(params.id, body.isActive)
          return { success: true, data, message: 'Updated' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({ isActive: t.Boolean() }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:tax:manage'))
      .post(
        '/wht-certificates',
        async ({ body, set, user }) => {
          const { userId } = user as AuthContextUser
          const data = await TaxService.createWhtCertificate(userId, {
            apBillId: body.apBillId,
            employeeId: body.employeeId,
            pndForm: body.pndForm,
            incomeType: body.incomeType,
            baseAmount: body.baseAmount,
            whtRate: body.whtRate,
            issuedDate: body.issuedDate,
          })
          set.status = 201
          return { success: true, data, message: 'Created' }
        },
        {
          body: t.Object({
            apBillId: t.Optional(t.String()),
            employeeId: t.Optional(t.String()),
            pndForm: t.String(),
            incomeType: t.String(),
            baseAmount: t.Number(),
            whtRate: t.Number(),
            issuedDate: t.String({ format: 'date' }),
          }),
        }
      )
  )
