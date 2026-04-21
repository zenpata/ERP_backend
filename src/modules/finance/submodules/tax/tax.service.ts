import { and, asc, count, desc, eq, gte, ilike, lt, ne, notInArray, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { db } from '../../../../shared/db/client'
import { AppError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { apBills, invoices, taxRates, whtCertificates } from '../../finance.schema'
import { employees } from '../../../hr/hr.schema'
import { buildAsciiPdf } from './tax-pdf'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

function monthBounds(month: number, year: number): { from: string; toNext: string } {
  const m = String(month).padStart(2, '0')
  const from = `${year}-${m}-01`
  if (month === 12) return { from, toNext: `${year + 1}-01-01` }
  const nextM = String(month + 1).padStart(2, '0')
  return { from, toNext: `${year}-${nextM}-01` }
}

async function nextCertificateNo(issuedDate: string, tx: DbTransaction): Promise<string> {
  const year = Number(issuedDate.slice(0, 4))
  const prefix = `WHT-${year}-`
  const rows = await tx
    .select({ no: whtCertificates.certificateNo })
    .from(whtCertificates)
    .where(ilike(whtCertificates.certificateNo, `${prefix}%`))
    .orderBy(desc(whtCertificates.certificateNo))
    .limit(1)
  let seq = 0
  if (rows[0]?.no) {
    const tail = rows[0].no.slice(prefix.length)
    const n = Number.parseInt(tail, 10)
    if (!Number.isNaN(n)) seq = n
  }
  return `${prefix}${String(seq + 1).padStart(4, '0')}`
}

export type TaxRateRow = {
  id: string
  type: string
  code: string
  rate: number
  description: string
  pndForm: string | null
  incomeType: string | null
  isActive: boolean
  createdAt: string
}

export type WhtCertificateRow = {
  id: string
  certificateNo: string
  pndForm: string
  incomeType: string
  baseAmount: number
  whtRate: number
  whtAmount: number
  issuedDate: string
  apBillId: string | null
  vendorId: string | null
  employeeId: string | null
  sourceModule: string
  createdAt: string
}

export type PndReportLine = {
  incomeType: string
  payeeCount: number
  baseAmount: number
  whtAmount: number
}

export const TaxService = {
  async listRates(query: { type?: string; isActive?: boolean }): Promise<TaxRateRow[]> {
    const conds = []
    if (query.type === 'VAT' || query.type === 'WHT') conds.push(eq(taxRates.type, query.type))
    if (query.isActive === true) conds.push(eq(taxRates.isActive, true))
    if (query.isActive === false) conds.push(eq(taxRates.isActive, false))
    const rows = await db
      .select()
      .from(taxRates)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(taxRates.type), asc(taxRates.code))
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      code: r.code,
      rate: Number(r.rate),
      description: r.description,
      pndForm: r.pndForm,
      incomeType: r.incomeType,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }))
  },

  async createRate(input: {
    type: 'VAT' | 'WHT'
    code: string
    rate: number
    description: string
    pndForm?: string | null
    incomeType?: string | null
  }): Promise<{ id: string }> {
    if (input.type === 'WHT') {
      if (!input.pndForm || !input.incomeType) {
        throw new ValidationError({ body: ['WHT rates require pndForm and incomeType'] })
      }
    }
    const [row] = await db
      .insert(taxRates)
      .values({
        type: input.type,
        code: input.code.trim(),
        rate: String(input.rate),
        description: input.description.trim(),
        pndForm: input.type === 'WHT' ? input.pndForm! : null,
        incomeType: input.type === 'WHT' ? input.incomeType! : null,
        isActive: true,
      })
      .returning({ id: taxRates.id })
    if (!row) throw new AppError('CREATE_FAILED', 'Could not create tax rate', 500)
    return { id: row.id }
  },

  async patchRate(
    id: string,
    input: Partial<{
      rate: number
      description: string
      pndForm: string | null
      incomeType: string | null
    }>
  ): Promise<{ id: string }> {
    const [existing] = await db.select().from(taxRates).where(eq(taxRates.id, id)).limit(1)
    if (!existing) throw new NotFoundError('Tax rate')
    if (existing.type === 'WHT') {
      if (input.pndForm === null || input.incomeType === null) {
        throw new ValidationError({ body: ['WHT rates cannot clear pndForm or incomeType'] })
      }
    }
    await db
      .update(taxRates)
      .set({
        ...(input.rate !== undefined ? { rate: String(input.rate) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.pndForm !== undefined ? { pndForm: input.pndForm } : {}),
        ...(input.incomeType !== undefined ? { incomeType: input.incomeType } : {}),
      })
      .where(eq(taxRates.id, id))
    return { id }
  },

  async setRateActive(id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> {
    const [existing] = await db.select().from(taxRates).where(eq(taxRates.id, id)).limit(1)
    if (!existing) throw new NotFoundError('Tax rate')
    await db.update(taxRates).set({ isActive }).where(eq(taxRates.id, id))
    return { id, isActive }
  },

  async vatSummary(month: number, year: number) {
    const { from, toNext } = monthBounds(month, year)
    const period = `${year}-${String(month).padStart(2, '0')}`

    const invWhere = and(
      gte(sql`${invoices.issueDate}::date`, sql`${from}::date`),
      lt(sql`${invoices.issueDate}::date`, sql`${toNext}::date`),
      notInArray(invoices.status, ['draft', 'cancelled'])
    )
    const [invAgg] = await db
      .select({
        sum: sql<string>`coalesce(sum(${invoices.vatAmount}), 0)`,
        cnt: count(),
      })
      .from(invoices)
      .where(invWhere)

    const apWhere = and(
      gte(sql`${apBills.issueDate}::date`, sql`${from}::date`),
      lt(sql`${apBills.issueDate}::date`, sql`${toNext}::date`),
      ne(apBills.status, 'rejected')
    )
    const [apAgg] = await db
      .select({
        sum: sql<string>`coalesce(sum(${apBills.vatAmount}), 0)`,
        cnt: count(),
      })
      .from(apBills)
      .where(apWhere)

    const outputVat = new Decimal(invAgg?.sum ?? '0')
    const inputVat = new Decimal(apAgg?.sum ?? '0')
    const netVatPayable = outputVat.minus(inputVat)

    return {
      period,
      outputVat: outputVat.toNumber(),
      inputVat: inputVat.toNumber(),
      netVatPayable: netVatPayable.toNumber(),
      invoiceCount: Number(invAgg?.cnt ?? 0),
      apBillCount: Number(apAgg?.cnt ?? 0),
    }
  },

  vatSummaryExportCsv(month: number, year: number): Promise<string> {
    return TaxService.vatSummary(month, year).then((s) => {
      const header = 'period,outputVat,inputVat,netVatPayable,invoiceCount,apBillCount\n'
      const row = `${s.period},${s.outputVat},${s.inputVat},${s.netVatPayable},${s.invoiceCount},${s.apBillCount}\n`
      return header + row
    })
  },

  async listWhtCertificates(query: {
    page?: number
    limit?: number
    pndForm?: string
    month?: number
    year?: number
    sourceModule?: 'ap' | 'payroll'
  }): Promise<PaginatedResult<WhtCertificateRow>> {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? 20, 100)
    const offset = (page - 1) * limit
    const conds = []
    if (query.pndForm) conds.push(eq(whtCertificates.pndForm, query.pndForm))
    if (query.month !== undefined && query.year !== undefined) {
      const { from, toNext } = monthBounds(query.month, query.year)
      conds.push(gte(whtCertificates.issuedDate, from))
      conds.push(lt(whtCertificates.issuedDate, toNext))
    }
    if (query.sourceModule === 'payroll') conds.push(sql`${whtCertificates.employeeId} IS NOT NULL`)
    if (query.sourceModule === 'ap') conds.push(sql`${whtCertificates.apBillId} IS NOT NULL`)

    const whereClause = conds.length ? and(...conds) : undefined

    const [totalRow] = await db.select({ c: count() }).from(whtCertificates).where(whereClause)
    const total = Number(totalRow?.c ?? 0)

    const rows = await db
      .select()
      .from(whtCertificates)
      .where(whereClause)
      .orderBy(desc(whtCertificates.issuedDate), desc(whtCertificates.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      data: rows.map((r) => ({
        id: r.id,
        certificateNo: r.certificateNo,
        pndForm: r.pndForm,
        incomeType: r.incomeType,
        baseAmount: Number(r.baseAmount),
        whtRate: Number(r.whtRate),
        whtAmount: Number(r.whtAmount),
        issuedDate: r.issuedDate,
        apBillId: r.apBillId,
        vendorId: r.vendorId,
        employeeId: r.employeeId,
        sourceModule: r.sourceModule,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        page,
        perPage: limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  },

  async createWhtCertificate(
    userId: string,
    input: {
      apBillId?: string
      employeeId?: string
      pndForm: string
      incomeType: string
      baseAmount: number
      whtRate: number
      issuedDate: string
    }
  ): Promise<{ id: string; certificateNo: string }> {
    const hasAp = Boolean(input.apBillId)
    const hasEmp = Boolean(input.employeeId)
    if (hasAp === hasEmp) {
      throw new ValidationError({ body: ['Provide exactly one of apBillId or employeeId'] })
    }
    const base = new Decimal(input.baseAmount)
    const rate = new Decimal(input.whtRate)
    const whtAmount = base.mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

    let vendorId: string | null = null
    let employeeId: string | null = null
    let apBillId: string | null = null
    let sourceModule: 'ap' | 'payroll' = 'ap'

    if (input.apBillId) {
      const [bill] = await db.select().from(apBills).where(eq(apBills.id, input.apBillId)).limit(1)
      if (!bill) throw new NotFoundError('AP bill')
      vendorId = bill.vendorId
      apBillId = bill.id
      sourceModule = 'ap'
    } else {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.id, input.employeeId!))
        .limit(1)
      if (!emp) throw new NotFoundError('Employee')
      employeeId = emp.id
      sourceModule = 'payroll'
    }

    const form = input.pndForm.toUpperCase()
    if (!['PND1', 'PND3', 'PND53'].includes(form)) {
      throw new ValidationError({ body: ['pndForm must be PND1, PND3, or PND53'] })
    }

    return await db.transaction(async (tx) => {
      const certificateNo = await nextCertificateNo(input.issuedDate, tx)
      const [row] = await tx
        .insert(whtCertificates)
        .values({
          certificateNo,
          vendorId,
          employeeId,
          apBillId,
          pndForm: form,
          incomeType: input.incomeType,
          baseAmount: base.toFixed(2),
          whtRate: rate.toFixed(2),
          whtAmount: whtAmount.toFixed(2),
          issuedDate: input.issuedDate,
          sourceModule,
          createdBy: userId,
        })
        .returning({ id: whtCertificates.id, certificateNo: whtCertificates.certificateNo })
      if (!row) throw new AppError('CREATE_FAILED', 'Could not create certificate', 500)
      return { id: row.id, certificateNo: row.certificateNo }
    })
  },

  async getWhtCertificatePdf(id: string): Promise<Buffer> {
    const [row] = await db.select().from(whtCertificates).where(eq(whtCertificates.id, id)).limit(1)
    if (!row) throw new NotFoundError('Certificate')
    const lines = [
      'Withholding Tax Certificate',
      `No: ${row.certificateNo}`,
      `PND Form: ${row.pndForm}`,
      `Income type: ${row.incomeType}`,
      `Issued: ${row.issuedDate}`,
      `Base: ${row.baseAmount}  Rate: ${row.whtRate}%  WHT: ${row.whtAmount}`,
    ]
    return buildAsciiPdf(lines)
  },

  async pndReport(form: string, month: number, year: number) {
    const f = form.toUpperCase()
    if (!['PND1', 'PND3', 'PND53'].includes(f)) {
      throw new ValidationError({ body: ['form must be PND1, PND3, or PND53'] })
    }
    const { from, toNext } = monthBounds(month, year)
    const period = `${year}-${String(month).padStart(2, '0')}`

    const rows = await db
      .select({
        incomeType: whtCertificates.incomeType,
        payeeCount: sql<number>`count(distinct coalesce(${whtCertificates.vendorId}::text, ${whtCertificates.employeeId}::text))`,
        baseAmount: sql<string>`coalesce(sum(${whtCertificates.baseAmount}), 0)`,
        whtAmount: sql<string>`coalesce(sum(${whtCertificates.whtAmount}), 0)`,
      })
      .from(whtCertificates)
      .where(
        and(
          eq(whtCertificates.pndForm, f),
          gte(whtCertificates.issuedDate, from),
          lt(whtCertificates.issuedDate, toNext)
        )
      )
      .groupBy(whtCertificates.incomeType)

    const summary = rows.reduce(
      (acc, r) => ({
        totalBase: acc.totalBase.plus(r.baseAmount ?? '0'),
        totalWht: acc.totalWht.plus(r.whtAmount ?? '0'),
        lineCount: acc.lineCount + 1,
      }),
      { totalBase: new Decimal(0), totalWht: new Decimal(0), lineCount: 0 }
    )

    return {
      form: f,
      period,
      summary: {
        totalBase: summary.totalBase.toNumber(),
        totalWht: summary.totalWht.toNumber(),
        lineCount: summary.lineCount,
      },
      lines: rows.map((r) => ({
        incomeType: r.incomeType,
        payeeCount: Number(r.payeeCount),
        baseAmount: new Decimal(r.baseAmount ?? '0').toNumber(),
        whtAmount: new Decimal(r.whtAmount ?? '0').toNumber(),
      })) as PndReportLine[],
    }
  },

  async pndReportExportCsv(form: string, month: number, year: number): Promise<string> {
    const rep = await TaxService.pndReport(form, month, year)
    let csv = `form,period,incomeType,payeeCount,baseAmount,whtAmount\n`
    for (const line of rep.lines) {
      csv += `${rep.form},${rep.period},${JSON.stringify(line.incomeType)},${line.payeeCount},${line.baseAmount},${line.whtAmount}\n`
    }
    return csv
  },
}
