import { and, asc, count, desc, eq, gte, inArray, lt, lte } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { bankAccounts, bankAccountTransactions, chartOfAccounts } from '../../finance.schema'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

function nextBankCodeFromRows(codes: string[]): string {
  let max = 0
  for (const c of codes) {
    const m = /^BA-(\d{4})$/.exec(c.trim().toUpperCase())
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `BA-${String(max + 1).padStart(4, '0')}`
}

async function nextBankCode(): Promise<string> {
  const rows = await db.select({ code: bankAccounts.code }).from(bankAccounts)
  return nextBankCodeFromRows(rows.map((r) => r.code))
}

export function maskAccountNo(accountNo: string): string {
  const s = accountNo.replace(/\s/g, '')
  if (s.length <= 4) return '****'
  return `***${s.slice(-4)}`
}

function signedAmount(type: string, amount: Decimal): Decimal {
  if (type === 'deposit') return amount
  if (type === 'withdrawal') return amount.neg()
  return amount.neg()
}

export type BankAccountListItem = {
  id: string
  code: string
  accountName: string
  accountNo: string
  bankName: string
  currentBalance: number
  isActive: boolean
  currency: string
}

export type BankAccountOption = { id: string; code: string; accountName: string; bankName: string }

export type BankAccountDetail = BankAccountListItem & {
  branchName?: string
  accountType: string
  openingBalance: number
  glAccountId?: string
  createdAt: string
  updatedAt: string
}

export type BankTransactionApi = {
  id: string
  transactionDate: string
  description: string
  type: string
  amount: number
  runningBalance: number
  referenceType?: string
  referenceId?: string
  sourceModule: string
  reconciled: boolean
  reconciledAt?: string
  reconciledBy?: string
  createdAt: string
}

export const BankAccountService = {
  async list(query: {
    page?: number
    perPage?: number
    isActive?: boolean
  }): Promise<PaginatedResult<BankAccountListItem>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage
    const conditions = []
    if (query.isActive !== undefined) conditions.push(eq(bankAccounts.isActive, query.isActive))
    const whereClause = conditions.length ? and(...conditions) : undefined

    const [cnt] = await db.select({ c: count() }).from(bankAccounts).where(whereClause)
    const total = Number(cnt?.c ?? 0)
    const rows = await db
      .select()
      .from(bankAccounts)
      .where(whereClause)
      .orderBy(desc(bankAccounts.updatedAt))
      .limit(perPage)
      .offset(offset)

    const data: BankAccountListItem[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      accountName: r.accountName,
      accountNo: maskAccountNo(r.accountNo),
      bankName: r.bankName,
      currentBalance: Number(r.currentBalance),
      isActive: r.isActive,
      currency: r.currency,
    }))
    return {
      data,
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    }
  },

  async options(): Promise<BankAccountOption[]> {
    const rows = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.isActive, true))
      .orderBy(asc(bankAccounts.code))
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      accountName: r.accountName,
      bankName: r.bankName,
    }))
  },

  async getById(id: string): Promise<BankAccountDetail> {
    const [r] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1)
    if (!r) throw new NotFoundError('bank account')
    const base: BankAccountDetail = {
      id: r.id,
      code: r.code,
      accountName: r.accountName,
      accountNo: maskAccountNo(r.accountNo),
      bankName: r.bankName,
      currentBalance: Number(r.currentBalance),
      isActive: r.isActive,
      currency: r.currency,
      accountType: r.accountType,
      openingBalance: Number(r.openingBalance),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }
    if (r.branchName) base.branchName = r.branchName
    if (r.glAccountId) base.glAccountId = r.glAccountId
    return base
  },

  async create(body: {
    code?: string
    accountName: string
    accountNo: string
    bankName: string
    branchName?: string
    accountType: string
    currency?: string
    openingBalance: number
    glAccountId?: string
  }) {
    const code = (body.code?.trim() || (await nextBankCode())).toUpperCase()
    if (!/^[A-Z0-9\-]{1,20}$/.test(code)) {
      throw new ValidationError({ code: ['รูปแบบต้องเป็น BA-0000 หรือเว้นว่างให้ระบบ gen'] })
    }
    const opening = new Decimal(body.openingBalance)
    if (!opening.isFinite() || opening.lt(0)) {
      throw new ValidationError({ openingBalance: ['ต้องเป็นตัวเลข ≥ 0'] })
    }
    if (body.glAccountId) {
      const [g] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, body.glAccountId)).limit(1)
      if (!g) throw new ValidationError({ glAccountId: ['ไม่พบบัญชี GL'] })
    }

    const [row] = await db
      .insert(bankAccounts)
      .values({
        code,
        accountName: body.accountName.trim(),
        accountNo: body.accountNo.trim(),
        bankName: body.bankName.trim(),
        branchName: body.branchName?.trim() || null,
        accountType: body.accountType.trim() || 'current',
        currency: body.currency?.trim() || 'THB',
        openingBalance: opening.toFixed(2),
        currentBalance: opening.toFixed(2),
        glAccountId: body.glAccountId ?? null,
        isActive: true,
      })
      .returning()
    if (!row) throw new ValidationError({ _: ['สร้างบัญชีไม่สำเร็จ'] })
    return BankAccountService.getById(row.id)
  },

  async patch(
    id: string,
    body: {
      accountName?: string
      accountNo?: string
      bankName?: string
      branchName?: string | null
      accountType?: string
      currency?: string
      glAccountId?: string | null
    }
  ): Promise<BankAccountDetail> {
    const [existing] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1)
    if (!existing) throw new NotFoundError('bank account')
    const patch: Partial<typeof bankAccounts.$inferInsert> = { updatedAt: new Date() }
    if (body.accountName !== undefined) patch.accountName = body.accountName.trim()
    if (body.accountNo !== undefined) patch.accountNo = body.accountNo.trim()
    if (body.bankName !== undefined) patch.bankName = body.bankName.trim()
    if (body.branchName !== undefined) patch.branchName = body.branchName?.trim() || null
    if (body.accountType !== undefined) patch.accountType = body.accountType.trim()
    if (body.currency !== undefined) patch.currency = body.currency.trim()
    if (body.glAccountId !== undefined) {
      if (body.glAccountId) {
        const [g] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, body.glAccountId)).limit(1)
        if (!g) throw new ValidationError({ glAccountId: ['ไม่พบบัญชี GL'] })
        patch.glAccountId = body.glAccountId
      } else {
        patch.glAccountId = null
      }
    }
    await db.update(bankAccounts).set(patch).where(eq(bankAccounts.id, id))
    return BankAccountService.getById(id)
  },

  async setActive(id: string, isActive: boolean): Promise<BankAccountDetail> {
    await db.update(bankAccounts).set({ isActive, updatedAt: new Date() }).where(eq(bankAccounts.id, id))
    return BankAccountService.getById(id)
  },

  async listTransactions(
    bankAccountId: string,
    query: {
      from?: string
      to?: string
      type?: string
      reconciled?: boolean
      page?: number
      perPage?: number
    }
  ): Promise<{
    data: BankTransactionApi[]
    meta: PaginatedResult<BankTransactionApi>['meta']
    summary: {
      openingBalance: number
      closingBalance: number
      totalDeposits: number
      totalWithdrawals: number
    }
  }> {
    const [acc] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, bankAccountId)).limit(1)
    if (!acc) throw new NotFoundError('bank account')

    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 50, 100)
    const offset = (page - 1) * perPage

    const conditions = [eq(bankAccountTransactions.bankAccountId, bankAccountId)]
    if (query.from) conditions.push(gte(bankAccountTransactions.transactionDate, query.from))
    if (query.to) conditions.push(lte(bankAccountTransactions.transactionDate, query.to))
    if (query.type) conditions.push(eq(bankAccountTransactions.type, query.type))
    if (query.reconciled !== undefined) conditions.push(eq(bankAccountTransactions.reconciled, query.reconciled))
    const whereClause = and(...conditions)

    const priorConditions = [eq(bankAccountTransactions.bankAccountId, bankAccountId)]
    if (query.from) priorConditions.push(lt(bankAccountTransactions.transactionDate, query.from))
    const priorWhere = and(...priorConditions)

    const priorRows = await db
      .select()
      .from(bankAccountTransactions)
      .where(priorWhere)
      .orderBy(asc(bankAccountTransactions.transactionDate), asc(bankAccountTransactions.createdAt))

    let opening = new Decimal(acc.openingBalance)
    for (const t of priorRows) {
      opening = opening.plus(signedAmount(t.type, new Decimal(t.amount)))
    }

    const allInRange = await db
      .select()
      .from(bankAccountTransactions)
      .where(whereClause)
      .orderBy(asc(bankAccountTransactions.transactionDate), asc(bankAccountTransactions.createdAt))

    const total = allInRange.length
    let runAll = opening
    let depAll = new Decimal(0)
    let wdrAll = new Decimal(0)
    const allMapped: BankTransactionApi[] = []
    for (const t of allInRange) {
      const amt = new Decimal(t.amount)
      const delta = signedAmount(t.type, amt)
      runAll = runAll.plus(delta)
      if (t.type === 'deposit') depAll = depAll.plus(amt)
      if (t.type === 'withdrawal') wdrAll = wdrAll.plus(amt)
      allMapped.push({
        id: t.id,
        transactionDate: t.transactionDate,
        description: t.description,
        type: t.type,
        amount: amt.toNumber(),
        runningBalance: runAll.toNumber(),
        ...(t.referenceType ? { referenceType: t.referenceType } : {}),
        ...(t.referenceId ? { referenceId: t.referenceId } : {}),
        sourceModule: t.sourceModule,
        reconciled: t.reconciled,
        ...(t.reconciledAt ? { reconciledAt: t.reconciledAt.toISOString() } : {}),
        ...(t.reconciledBy ? { reconciledBy: t.reconciledBy } : {}),
        createdAt: t.createdAt.toISOString(),
      })
    }

    const data = allMapped.slice(offset, offset + perPage)

    return {
      data,
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
      summary: {
        openingBalance: opening.toNumber(),
        closingBalance: runAll.toNumber(),
        totalDeposits: depAll.toNumber(),
        totalWithdrawals: wdrAll.toNumber(),
      },
    }
  },

  async createManualTransaction(
    bankAccountId: string,
    body: { transactionDate: string; description: string; type: 'deposit' | 'withdrawal'; amount: number }
  ): Promise<BankTransactionApi> {
    const amt = new Decimal(body.amount)
    if (!amt.isFinite() || amt.lte(0)) throw new ValidationError({ amount: ['ต้องมากกว่า 0'] })

    return await db.transaction(async (tx) => {
      const [acc] = await tx.select().from(bankAccounts).where(eq(bankAccounts.id, bankAccountId)).limit(1)
      if (!acc) throw new NotFoundError('bank account')
      if (!acc.isActive) throw new AppError('BANK_INACTIVE', 'บัญชีธนาคารปิดการลงรายการ', 400)

      const nextBal = new Decimal(acc.currentBalance).plus(signedAmount(body.type, amt))
      if (nextBal.lt(0)) throw new ValidationError({ amount: ['ยอดคงเหลือไม่พอ'] })

      const [t] = await tx
        .insert(bankAccountTransactions)
        .values({
          bankAccountId,
          transactionDate: body.transactionDate,
          description: body.description.trim(),
          type: body.type,
          amount: amt.toFixed(2),
          referenceType: 'manual',
          sourceModule: 'manual',
        })
        .returning()

      if (!t) throw new ValidationError({ _: ['บันทึกไม่สำเร็จ'] })

      await tx
        .update(bankAccounts)
        .set({ currentBalance: nextBal.toFixed(2), updatedAt: new Date() })
        .where(eq(bankAccounts.id, bankAccountId))

      return {
        id: t.id,
        transactionDate: t.transactionDate,
        description: t.description,
        type: t.type,
        amount: Number(t.amount),
        runningBalance: nextBal.toNumber(),
        referenceType: 'manual',
        sourceModule: 'manual',
        reconciled: false,
        createdAt: t.createdAt.toISOString(),
      }
    })
  },

  async reconcile(bankAccountId: string, transactionIds: string[], userId: string) {
    if (!transactionIds.length) throw new ValidationError({ transactionIds: ['ต้องมีอย่างน้อย 1 รายการ'] })
    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(bankAccountTransactions)
        .where(
          and(eq(bankAccountTransactions.bankAccountId, bankAccountId), inArray(bankAccountTransactions.id, transactionIds))
        )
      if (rows.length !== transactionIds.length) {
        throw new AppError('BANK_RECONCILE_MISMATCH', 'บางรายการไม่พบหรือไม่ใช่บัญชีนี้', 400)
      }
      const now = new Date()
      await tx
        .update(bankAccountTransactions)
        .set({ reconciled: true, reconciledAt: now, reconciledBy: userId })
        .where(
          and(eq(bankAccountTransactions.bankAccountId, bankAccountId), inArray(bankAccountTransactions.id, transactionIds))
        )
      return {
        reconciledCount: rows.length,
        matchedIds: rows.map((r) => r.id),
        reconciledAt: now.toISOString(),
        reconciledBy: userId,
      }
    })
  },

  /**
   * Called inside invoice payment transaction when bankAccountId is a valid active bank UUID.
   */
  async appendArDepositFromInvoicePayment(
    tx: DbTransaction,
    params: {
      bankAccountId: string
      paymentId: string
      amount: string
      paymentDate: Date
      description: string
    }
  ): Promise<void> {
    const [acc] = await tx.select().from(bankAccounts).where(eq(bankAccounts.id, params.bankAccountId)).limit(1)
    if (!acc) throw new AppError('BANK_ACCOUNT_NOT_FOUND', 'ไม่พบบัญชีธนาคาร', 404)
    if (!acc.isActive) throw new AppError('BANK_INACTIVE', 'บัญชีธนาคารปิดการลงรายการ', 400)

    const amt = new Decimal(params.amount)
    const nextBal = new Decimal(acc.currentBalance).plus(amt)

    await tx.insert(bankAccountTransactions).values({
      bankAccountId: params.bankAccountId,
      transactionDate: params.paymentDate.toISOString().slice(0, 10),
      description: params.description,
      type: 'deposit',
      amount: amt.toFixed(2),
      referenceType: 'invoice_payment',
      referenceId: params.paymentId,
      sourceModule: 'ar',
    })

    await tx
      .update(bankAccounts)
      .set({ currentBalance: nextBal.toFixed(2), updatedAt: new Date() })
      .where(eq(bankAccounts.id, params.bankAccountId))
  },
}
