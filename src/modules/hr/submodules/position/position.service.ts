import { and, asc, count, eq, ilike } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { departments, employees, positions } from '../../hr.schema'
import type { ListPositionQuery, Position, PositionDetail, PositionListRow } from '../../hr.types'

export type CreatePositionPayload = {
  name: string
  departmentId?: string
  level?: number
}

export type UpdatePositionPayload = Partial<{
  name: string
  departmentId: string | null
  level: number
}>

async function nextPositionCode(): Promise<string> {
  const [r] = await db.select({ count: count() }).from(positions)
  const n = Number(r?.count ?? 0) + 1
  return `POS-${String(n).padStart(3, '0')}`
}

async function assertDepartmentExists(departmentId: string): Promise<void> {
  const d = await db.query.departments.findFirst({ where: eq(departments.id, departmentId) })
  if (!d) {
    throw new ValidationError(
      { departmentId: ['ไม่พบแผนก'] },
      'ข้อมูลไม่ถูกต้อง',
      { code: 'INVALID_DEPARTMENT_ID', statusCode: 422 }
    )
  }
}

export const PositionService = {
  async list(query: ListPositionQuery): Promise<PaginatedResult<PositionListRow>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = []
    if (query.search?.trim()) {
      conditions.push(ilike(positions.name, `%${query.search.trim()}%`))
    }
    if (query.departmentId) {
      conditions.push(eq(positions.departmentId, query.departmentId))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const base = db
      .select({
        id: positions.id,
        code: positions.code,
        name: positions.name,
        departmentId: positions.departmentId,
        level: positions.level,
        createdAt: positions.createdAt,
        updatedAt: positions.updatedAt,
        departmentName: departments.name,
      })
      .from(positions)
      .leftJoin(departments, eq(positions.departmentId, departments.id))
      .where(where)
      .orderBy(asc(positions.level), asc(positions.name))
      .limit(perPage)
      .offset(offset)

    const [rows, totalResult] = await Promise.all([
      base,
      db.select({ count: count() }).from(positions).where(where),
    ])

    const total = Number(totalResult[0]?.count ?? 0)

    const data: PositionListRow[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      departmentId: r.departmentId,
      level: r.level,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      departmentName: r.departmentName,
    }))

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage) || 0,
      },
    }
  },

  async getById(id: string): Promise<PositionDetail> {
    const row = await db
      .select({
        id: positions.id,
        code: positions.code,
        name: positions.name,
        departmentId: positions.departmentId,
        level: positions.level,
        createdAt: positions.createdAt,
        updatedAt: positions.updatedAt,
        departmentName: departments.name,
      })
      .from(positions)
      .leftJoin(departments, eq(positions.departmentId, departments.id))
      .where(eq(positions.id, id))
      .limit(1)

    const first = row[0]
    if (!first) {
      throw new NotFoundError('ตำแหน่ง', { code: 'POSITION_NOT_FOUND', message: 'ไม่พบตำแหน่ง' })
    }

    const [cnt] = await db
      .select({ count: count() })
      .from(employees)
      .where(and(eq(employees.positionId, id), eq(employees.status, 'active')))

    return {
      id: first.id,
      code: first.code,
      name: first.name,
      departmentId: first.departmentId,
      level: first.level,
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
      departmentName: first.departmentName,
      employeeCount: Number(cnt?.count ?? 0),
    }
  },

  async create(payload: CreatePositionPayload): Promise<Position> {
    if (payload.departmentId) {
      await assertDepartmentExists(payload.departmentId)
    }

    const code = await nextPositionCode()
    const [created] = await db
      .insert(positions)
      .values({
        code,
        name: payload.name,
        departmentId: payload.departmentId ?? null,
        level: payload.level ?? 0,
      })
      .returning()
    if (!created) {
      throw new ValidationError({ name: ['สร้างตำแหน่งไม่สำเร็จ'] }, 'ข้อมูลไม่ถูกต้อง', { statusCode: 422 })
    }
    return created as Position
  },

  async update(id: string, payload: UpdatePositionPayload): Promise<Position> {
    const existing = await db.query.positions.findFirst({ where: eq(positions.id, id) })
    if (!existing) {
      throw new NotFoundError('ตำแหน่ง', { code: 'POSITION_NOT_FOUND', message: 'ไม่พบตำแหน่ง' })
    }

    if (payload.departmentId !== undefined && payload.departmentId !== null) {
      await assertDepartmentExists(payload.departmentId)
    }

    const [updated] = await db
      .update(positions)
      .set({
        updatedAt: new Date(),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.departmentId !== undefined ? { departmentId: payload.departmentId } : {}),
        ...(payload.level !== undefined ? { level: payload.level } : {}),
      })
      .where(eq(positions.id, id))
      .returning()
    if (!updated) {
      throw new NotFoundError('ตำแหน่ง', { code: 'POSITION_NOT_FOUND', message: 'ไม่พบตำแหน่ง' })
    }
    return updated as Position
  },

  async remove(id: string): Promise<void> {
    const existing = await db.query.positions.findFirst({ where: eq(positions.id, id) })
    if (!existing) {
      throw new NotFoundError('ตำแหน่ง', { code: 'POSITION_NOT_FOUND', message: 'ไม่พบตำแหน่ง' })
    }

    const [activeEmp] = await db
      .select({ count: count() })
      .from(employees)
      .where(and(eq(employees.positionId, id), eq(employees.status, 'active')))
    if (Number(activeEmp?.count ?? 0) > 0) {
      throw new ConflictError('POSITION_HAS_EMPLOYEES', 'ตำแหน่งยังมีพนักงาน active อยู่')
    }

    await db.delete(positions).where(eq(positions.id, id))
  },
}
