import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { ConflictError, ValidationError } from '../../../../shared/middleware/error.middleware'
import { chartOfAccounts } from '../../finance.schema'

export type AccountRow = typeof chartOfAccounts.$inferSelect

export const AccountsService = {
  async list(params: { search?: string; isActive?: boolean }): Promise<AccountRow[]> {
    const { search, isActive } = params
    const conditions = []
    if (search !== undefined && search.trim() !== '') {
      const term = `%${search.trim()}%`
      conditions.push(or(ilike(chartOfAccounts.code, term), ilike(chartOfAccounts.name, term))!)
    }
    if (isActive !== undefined) {
      conditions.push(eq(chartOfAccounts.isActive, isActive))
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined
    return db.select().from(chartOfAccounts).where(where).orderBy(asc(chartOfAccounts.code))
  },

  async getById(id: string): Promise<AccountRow | null> {
    const rows = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, id)).limit(1)
    return rows[0] ?? null
  },

  async create(input: { code: string; name: string; type: string; parentId?: string | null }): Promise<AccountRow> {
    const code = input.code.trim().toUpperCase()
    if (code.length === 0) throw new ValidationError({ code: ['Required'] })
    const existing = await db.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1)
    if (existing.length > 0) throw new ConflictError('DUPLICATE', 'Account code already exists')
    const [row] = await db
      .insert(chartOfAccounts)
      .values({
        code,
        name: input.name.trim(),
        type: input.type.trim(),
        parentId: input.parentId ?? null,
        isActive: true,
      })
      .returning()
    if (!row) throw new ValidationError({ _: ['Insert failed'] })
    return row
  },

  async patch(
    id: string,
    input: { name?: string; type?: string; parentId?: string | null; isActive?: boolean }
  ): Promise<AccountRow | null> {
    const existing = await AccountsService.getById(id)
    if (!existing) return null
    const [row] = await db
      .update(chartOfAccounts)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.type !== undefined ? { type: input.type.trim() } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      })
      .where(eq(chartOfAccounts.id, id))
      .returning()
    return row ?? null
  },

  async setActive(id: string, isActive: boolean): Promise<AccountRow | null> {
    return AccountsService.patch(id, { isActive })
  },

  async seedDefaultsIfEmpty(): Promise<void> {
    const c = await db.select({ n: sql<number>`count(*)::int` }).from(chartOfAccounts)
    if ((c[0]?.n ?? 0) > 0) return
    await db.insert(chartOfAccounts).values([
      { code: '1000', name: 'สินทรัพย์', type: 'asset', isActive: true },
      { code: '2000', name: 'หนี้สิน', type: 'liability', isActive: true },
      { code: '3000', name: 'ทุน', type: 'equity', isActive: true },
      { code: '4000', name: 'รายได้', type: 'revenue', isActive: true },
      { code: '5000', name: 'ค่าใช้จ่าย', type: 'expense', isActive: true },
    ])
  },
}
