import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { BankReconcileService } from './bank-reconcile.service'

// ============================================================
// bank-reconcile.routes.ts — Bank Statement Import API (R3-04)
// prefix: mounted under /api/finance
// ============================================================

const statementLineSchema = t.Object({
  transactionDate: t.String(),
  description: t.String({ minLength: 1 }),
  amount: t.Numeric(),
  referenceNo: t.Optional(t.String()),
})

export const bankReconcileRoutes = new Elysia()
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:view', 'finance:account:view'))
      .get(
        '/bank-accounts/:id/statement-imports',
        async ({ params, query }) => {
          const result = await BankReconcileService.listImports({
            page: query.page !== undefined ? Number(query.page) : 1,
            perPage: query.perPage !== undefined ? Number(query.perPage) : 20,
            bankAccountId: params.id,
          })
          return { success: true, data: result.data, meta: result.meta }
        },
        {
          query: t.Object({
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          }),
        }
      )
      .get(
        '/statement-imports/:importId/lines',
        async ({ params, query }) => {
          const data = await BankReconcileService.getImportLines(
            params.importId,
            query.matchStatus
          )
          return { success: true, data }
        },
        {
          query: t.Object({
            matchStatus: t.Optional(t.String()),
          }),
        }
      )
      .get(
        '/statement-imports/:importId/summary',
        async ({ params }) => {
          const data = await BankReconcileService.getMatchSummary(params.importId)
          return { success: true, data }
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:edit', 'finance:invoice:payment'))
      .post(
        '/bank-accounts/:id/import-statement',
        async ({ params, body }) => {
          const result = await BankReconcileService.createImport({
            bankAccountId: params.id,
            periodFrom: body.periodFrom,
            periodTo: body.periodTo,
            lines: body.lines,
          })
          return { success: true, data: result }
        },
        {
          body: t.Object({
            periodFrom: t.String(),
            periodTo: t.String(),
            lines: t.Array(statementLineSchema, { minItems: 1 }),
          }),
        }
      )
      .post(
        '/statement-imports/:importId/confirm-matches',
        async ({ params, body }) => {
          const result = await BankReconcileService.confirmMatches(params.importId, body.lineIds)
          return { success: true, data: result }
        },
        {
          body: t.Object({
            lineIds: t.Array(t.String(), { minItems: 1 }),
          }),
        }
      )
      .patch(
        '/statement-lines/:lineId/match',
        async ({ params, body }) => {
          const data = await BankReconcileService.matchLine(params.lineId, body.invoiceId)
          return { success: true, data }
        },
        {
          body: t.Object({
            invoiceId: t.Optional(t.String()),
          }),
        }
      )
  )
