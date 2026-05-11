import { and, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { AppError, ConflictError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { apBills, vendors } from '../../finance.schema'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

const VENDOR_CODE_RE = /^[A-Z0-9\-]{1,20}$/

function normalizeVendorCode(code: string): string {
  return code.trim().toUpperCase()
}

function assertTaxId(taxId: string | undefined): void {
  if (taxId === undefined || taxId === '') return
  if (!/^\d{13}$/.test(taxId)) {
    throw new ValidationError({ taxId: ['Must be 13 digits'] })
  }
}

function assertEmail(email: string | undefined): void {
  if (email === undefined || email === '') return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError({ email: ['รูปแบบอีเมลไม่ถูกต้อง'] })
  }
}

async function nextVendorCode(tx: DbTransaction): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(881001)`)
  const rows = await tx.select({ code: vendors.code }).from(vendors)
  let max = 0
  for (const r of rows) {
    const m = /^V-(\d{4})$/.exec(normalizeVendorCode(r.code))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `V-${String(max + 1).padStart(4, '0')}`
}

async function countOpenApForVendor(vendorId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(apBills)
    .where(
      and(
        eq(apBills.vendorId, vendorId),
        or(
          eq(apBills.status, 'pending'),
          eq(apBills.status, 'approved'),
          eq(apBills.status, 'overdue')
        )
      )
    )
  return Number(row?.c ?? 0)
}

function mapVendorRow(v: typeof vendors.$inferSelect) {
  return {
    id: v.id,
    code: v.code,
    name: v.name,
    taxId: v.taxId ?? undefined,
    address: v.address ?? undefined,
    phone: v.phone ?? undefined,
    email: v.email ?? undefined,
    contactName: v.contactName ?? undefined,
    bankName: v.bankName ?? undefined,
    bankAccountNumber: v.bankAccountNumber ?? undefined,
    bankAccountName: v.bankAccountName ?? undefined,
    paymentTermDays: v.paymentTermDays,
    notes: v.notes ?? undefined,
    isActive: v.isActive,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    deletedAt: v.deletedAt ? v.deletedAt.toISOString() : undefined,
  }
}

export type VendorListItem = ReturnType<typeof mapVendorRow>
export type VendorDetail = ReturnType<typeof mapVendorRow>

export const VendorService = {
  async list(query: {
    search?: string
    page?: number
    perPage?: number
    isActive?: boolean
  }): Promise<PaginatedResult<VendorListItem>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = [isNull(vendors.deletedAt)]
    if (query.isActive !== undefined) {
      conditions.push(eq(vendors.isActive, query.isActive))
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`
      conditions.push(
        or(
          ilike(vendors.name, term),
          ilike(vendors.code, term),
          ilike(vendors.taxId, term)
        )!
      )
    }
    const whereClause = and(...conditions)

    const [countRow] = await db.select({ c: count() }).from(vendors).where(whereClause)
    const total = Number(countRow?.c ?? 0)

    const rows = await db
      .select()
      .from(vendors)
      .where(whereClause)
      .orderBy(desc(vendors.createdAt))
      .limit(perPage)
      .offset(offset)

    return {
      data: rows.map(mapVendorRow),
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  },

  async options(search?: string) {
    const conditions = [eq(vendors.isActive, true), isNull(vendors.deletedAt)]
    if (search?.trim()) {
      const term = `%${search.trim()}%`
      conditions.push(
        or(ilike(vendors.name, term), ilike(vendors.code, term), ilike(vendors.taxId, term))!
      )
    }
    const rows = await db
      .select({
        id: vendors.id,
        code: vendors.code,
        name: vendors.name,
      })
      .from(vendors)
      .where(and(...conditions))
      .orderBy(vendors.name)
      .limit(100)
    return rows
  },

  async getById(id: string): Promise<VendorDetail> {
    const v = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, id), isNull(vendors.deletedAt)),
    })
    if (!v) throw new AppError('VENDOR_NOT_FOUND', 'Vendor not found', 404)
    return mapVendorRow(v)
  },

  async create(body: {
    code?: string
    name: string
    taxId?: string
    address?: string
    phone?: string
    email?: string
    contactName?: string
    bankName?: string
    bankAccountNumber?: string
    bankAccountName?: string
    paymentTermDays?: number
    notes?: string
  }) {
    if (!body.name?.trim()) {
      throw new ValidationError({ name: ['กรุณากรอกชื่อผู้ขาย'] })
    }
    assertTaxId(body.taxId)
    assertEmail(body.email)

    const paymentTermDays = body.paymentTermDays ?? 30
    if (!Number.isInteger(paymentTermDays) || paymentTermDays < 0) {
              throw new ValidationError({ paymentTermDays: ['Must be a non-negative integer'] })
    }

    return await db.transaction(async (tx) => {
      let code: string
      if (body.code?.trim()) {
        code = normalizeVendorCode(body.code)
        if (!VENDOR_CODE_RE.test(code)) {
          throw new ValidationError({ code: ['รูปแบบต้องเป็น V-0000'] })
        }
      } else {
        code = await nextVendorCode(tx)
      }

      const taxId = body.taxId?.trim() || null
      if (taxId) {
        const dup = await tx.query.vendors.findFirst({
          where: and(eq(vendors.taxId, taxId), isNull(vendors.deletedAt)),
        })
        if (dup) {
          throw new ConflictError('VENDOR_TAX_ID_DUPLICATE', 'Tax ID already exists', {
            taxId: 'Duplicate tax ID',
          })
        }
      }

      const dupCode = await tx.query.vendors.findFirst({
        where: and(eq(vendors.code, code), isNull(vendors.deletedAt)),
      })
      if (dupCode) {
        throw new ConflictError('VENDOR_CODE_DUPLICATE', 'Vendor code already exists', {
          code: 'รหัส Vendor นี้มีในระบบแล้ว กรุณาใช้รหัสอื่น',
        })
      }

      const [created] = await tx
        .insert(vendors)
        .values({
          code,
          name: body.name.trim(),
          taxId,
          address: body.address?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
          contactName: body.contactName?.trim() || null,
          bankName: body.bankName?.trim() || null,
          bankAccountNumber: body.bankAccountNumber?.trim() || null,
          bankAccountName: body.bankAccountName?.trim() || null,
          paymentTermDays,
          notes: body.notes?.trim() || null,
          isActive: true,
        })
        .returning()

      if (!created) throw new ValidationError({ vendor: ['สร้าง vendor ไม่สำเร็จ'] })
      return {
        id: created.id,
        code: created.code,
        name: created.name,
        taxId: created.taxId ?? undefined,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
      }
    })
  },

  async update(
    id: string,
    body: {
      name?: string
      taxId?: string | null
      address?: string | null
      phone?: string | null
      email?: string | null
      contactName?: string | null
      bankName?: string | null
      bankAccountNumber?: string | null
      bankAccountName?: string | null
      paymentTermDays?: number
      notes?: string | null
    }
  ) {
    const existing = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, id), isNull(vendors.deletedAt)),
    })
    if (!existing) throw new AppError('VENDOR_NOT_FOUND', 'Vendor not found', 404)

    if (body.taxId !== undefined && body.taxId !== null && body.taxId !== '') {
      assertTaxId(body.taxId)
      const tid = body.taxId.trim()
      const dup = await db.query.vendors.findFirst({
        where: and(eq(vendors.taxId, tid), isNull(vendors.deletedAt)),
      })
      if (dup && dup.id !== id) {
        throw new ConflictError('VENDOR_TAX_ID_DUPLICATE', 'Tax ID already exists', {
          taxId: 'Duplicate tax ID',
        })
      }
    }
    if (body.email !== undefined && body.email !== null) assertEmail(body.email || undefined)
    if (body.paymentTermDays !== undefined) {
      if (!Number.isInteger(body.paymentTermDays) || body.paymentTermDays < 0) {
        throw new ValidationError({ paymentTermDays: ['Must be a non-negative integer'] })
      }
    }

    const patch: Partial<typeof vendors.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (body.name !== undefined) {
      if (!body.name.trim()) throw new ValidationError({ name: ['กรุณากรอกชื่อผู้ขาย'] })
      patch.name = body.name.trim()
    }
    if (body.taxId !== undefined) patch.taxId = body.taxId?.trim() || null
    if (body.address !== undefined) patch.address = body.address?.trim() || null
    if (body.phone !== undefined) patch.phone = body.phone?.trim() || null
    if (body.email !== undefined) patch.email = body.email?.trim() || null
    if (body.contactName !== undefined) patch.contactName = body.contactName?.trim() || null
    if (body.bankName !== undefined) patch.bankName = body.bankName?.trim() || null
    if (body.bankAccountNumber !== undefined)
      patch.bankAccountNumber = body.bankAccountNumber?.trim() || null
    if (body.bankAccountName !== undefined)
      patch.bankAccountName = body.bankAccountName?.trim() || null
    if (body.paymentTermDays !== undefined) patch.paymentTermDays = body.paymentTermDays
    if (body.notes !== undefined) patch.notes = body.notes?.trim() || null

    await db.update(vendors).set(patch).where(eq(vendors.id, id))
    return this.getById(id)
  },

  async activate(id: string, isActive: boolean) {
    const existing = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, id), isNull(vendors.deletedAt)),
    })
    if (!existing) throw new AppError('VENDOR_NOT_FOUND', 'Vendor not found', 404)

    const pendingApCount = isActive ? 0 : await countOpenApForVendor(id)

    await db
      .update(vendors)
      .set({
        isActive,
        updatedAt: new Date(),
        ...(isActive ? { deletedAt: null } : {}),
      })
      .where(eq(vendors.id, id))

    return {
      id,
      isActive,
      meta: { pendingApCount },
    }
  },

  async remove(id: string) {
    const existing = await db.query.vendors.findFirst({
      where: and(eq(vendors.id, id), isNull(vendors.deletedAt)),
    })
    if (!existing) throw new AppError('VENDOR_NOT_FOUND', 'Vendor not found', 404)

    const [apRow] = await db
      .select({ c: count() })
      .from(apBills)
      .where(eq(apBills.vendorId, id))
    const apCount = Number(apRow?.c ?? 0)
    if (apCount > 0) {
      throw new ConflictError('VENDOR_HAS_AP_RECORDS', 'Vendor has AP records')
    }

    await db.update(vendors).set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() }).where(eq(vendors.id, id))
    return { success: true as const }
  },
}
