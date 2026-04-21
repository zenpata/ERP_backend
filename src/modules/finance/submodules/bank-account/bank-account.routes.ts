import { Elysia, t } from 'elysia'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { BankAccountService } from './bank-account.service'

const listQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  isActive: t.Optional(t.String()),
})

export const bankAccountRoutes = new Elysia({ prefix: '/bank-accounts' })
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:view'))
      .get(
        '/options',
        async () => {
          const data = await BankAccountService.options()
          return { success: true, data }
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:view'))
      .get(
        '/',
        async ({ query }) => {
          const q: Parameters<typeof BankAccountService.list>[0] = {}
          if (query.page !== undefined) q.page = Number(query.page)
          if (query.perPage !== undefined) q.perPage = Number(query.perPage)
          if (query.isActive === 'true') q.isActive = true
          else if (query.isActive === 'false') q.isActive = false
          const result = await BankAccountService.list(q)
          return { success: true, data: result.data, meta: result.meta }
        },
        { query: listQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:create'))
      .post(
        '/',
        async ({ body, set }) => {
          const data = await BankAccountService.create({
            ...(body.code !== undefined ? { code: body.code } : {}),
            accountName: body.accountName,
            accountNo: body.accountNo,
            bankName: body.bankName,
            branchName: body.branchName,
            accountType: body.accountType,
            currency: body.currency,
            openingBalance: Number(body.openingBalance),
            glAccountId: body.glAccountId,
          })
          set.status = 201
          return { success: true, data, message: 'บัญชีธนาคารถูกสร้างสำเร็จ' }
        },
        {
          body: t.Object({
            code: t.Optional(t.String()),
            accountName: t.String({ minLength: 1 }),
            accountNo: t.String({ minLength: 1 }),
            bankName: t.String({ minLength: 1 }),
            branchName: t.Optional(t.String()),
            accountType: t.String({ minLength: 1 }),
            currency: t.Optional(t.String()),
            openingBalance: t.Numeric({ minimum: 0 }),
            glAccountId: t.Optional(t.String()),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:view'))
      .get(
        '/:id/transactions',
        async ({ params, query }) => {
          const result = await BankAccountService.listTransactions(params.id, {
            ...(query.from !== undefined ? { from: query.from } : {}),
            ...(query.to !== undefined ? { to: query.to } : {}),
            ...(query.type !== undefined ? { type: query.type } : {}),
            ...(query.reconciled === 'true' ? { reconciled: true } : {}),
            ...(query.reconciled === 'false' ? { reconciled: false } : {}),
            ...(query.page !== undefined ? { page: Number(query.page) } : {}),
            ...(query.perPage !== undefined ? { perPage: Number(query.perPage) } : {}),
          })
          return {
            success: true,
            data: {
              transactions: result.data,
              meta: result.meta,
              summary: result.summary,
            },
          }
        },
        {
          params: t.Object({ id: t.String() }),
          query: t.Object({
            from: t.Optional(t.String()),
            to: t.Optional(t.String()),
            type: t.Optional(t.String()),
            reconciled: t.Optional(t.String()),
            page: t.Optional(t.Numeric({ minimum: 1 })),
            perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:edit'))
      .post(
        '/:id/transactions',
        async ({ params, body, set }) => {
          const data = await BankAccountService.createManualTransaction(params.id, {
            transactionDate: body.transactionDate,
            description: body.description,
            type: body.type,
            amount: Number(body.amount),
          })
          set.status = 201
          return { success: true, data, message: 'บันทึกรายการสำเร็จ' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            transactionDate: t.String({ format: 'date' }),
            description: t.String({ minLength: 1 }),
            type: t.Union([t.Literal('deposit'), t.Literal('withdrawal')]),
            amount: t.Numeric({ minimum: 0.01 }),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:edit'))
      .post(
        '/:id/reconcile',
        async ({ params, body, user, set }) => {
          const data = await BankAccountService.reconcile(params.id, body.transactionIds, user.userId)
          set.status = 201
          return { success: true, data, message: `กระทบยอด ${data.reconciledCount} รายการสำเร็จ` }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            transactionIds: t.Array(t.String(), { minItems: 1 }),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:activate'))
      .patch(
        '/:id/activate',
        async ({ params, body }) => {
          const data = await BankAccountService.setActive(params.id, body.isActive)
          return { success: true, data, message: 'Success' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({ isActive: t.Boolean() }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:edit'))
      .patch(
        '/:id',
        async ({ params, body }) => {
          const data = await BankAccountService.patch(params.id, {
            ...(body.accountName !== undefined ? { accountName: body.accountName } : {}),
            ...(body.accountNo !== undefined ? { accountNo: body.accountNo } : {}),
            ...(body.bankName !== undefined ? { bankName: body.bankName } : {}),
            ...(body.branchName !== undefined ? { branchName: body.branchName } : {}),
            ...(body.accountType !== undefined ? { accountType: body.accountType } : {}),
            ...(body.currency !== undefined ? { currency: body.currency } : {}),
            ...(body.glAccountId !== undefined ? { glAccountId: body.glAccountId } : {}),
          })
          return { success: true, data, message: 'Success' }
        },
        {
          params: t.Object({ id: t.String() }),
          body: t.Object({
            accountName: t.Optional(t.String()),
            accountNo: t.Optional(t.String()),
            bankName: t.Optional(t.String()),
            branchName: t.Optional(t.Nullable(t.String())),
            accountType: t.Optional(t.String()),
            currency: t.Optional(t.String()),
            glAccountId: t.Optional(t.Nullable(t.String())),
          }),
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('finance:bank_account:view'))
      .get(
        '/:id',
        async ({ params }) => {
          const data = await BankAccountService.getById(params.id)
          return { success: true, data }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
