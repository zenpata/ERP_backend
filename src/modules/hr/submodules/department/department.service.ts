import { and, asc, count, eq, ilike } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { departments, employees, positions } from '../../hr.schema'
import type { Department, DepartmentDetail, ListDepartmentQuery } from '../../hr.types'

export type CreateDepartmentPayload = {
  name: string
  description?: string
  parentId?: string
  managerId?: string
}

export type UpdateDepartmentPayload = Partial<{
  name: string
  description: string | null
  parentId: string | null
  managerId: string | null
}>

async function nextDeptCode(): Promise<string> {
  const [r] = await db.select({ count: count() }).from(departments)
  const n = Number(r?.count ?? 0) + 1
  return `DEPT-${String(n).padStart(3, '0')}`
}

/** Level from root: root = 1, child = 2, … */
async function levelFromRoot(departmentId: string): Promise<number> {
  let level = 1
  let cur: string | null = departmentId
  const seen = new Set<string>()
  while (cur) {
    if (seen.has(cur)) {
      throw new ValidationError(
        { parentId: ['โครงสร้างแผนกไม่ถูกต้อง'] },
        'ข้อมูลไม่ถูกต้อง',
        { code: 'CIRCULAR_HIERARCHY', statusCode: 422 }
      )
    }
    seen.add(cur)
    const row: { parentId: string | null } | undefined = await db.query.departments.findFirst({
      where: eq(departments.id, cur),
      columns: { parentId: true },
    })
    if (!row) return level
    if (!row.parentId) return level
    level++
    cur = row.parentId
  }
  return level
}

async function assertNewDepthOk(parentId: string | null | undefined): Promise<void> {
  if (!parentId) return
  const parentLevel = await levelFromRoot(parentId)
  if (parentLevel + 1 > 3) {
    throw new ValidationError(
      { parentId: ['เกินความลึกสูงสุด 3 ระดับ'] },
      'ข้อมูลไม่ถูกต้อง',
      { code: 'MAX_DEPTH_EXCEEDED', statusCode: 422 }
    )
  }
}

async function assertParentExists(parentId: string): Promise<void> {
  const p = await db.query.departments.findFirst({ where: eq(departments.id, parentId) })
  if (!p) {
    throw new ValidationError(
      { parentId: ['ไม่พบแผนกแม่'] },
      'ข้อมูลไม่ถูกต้อง',
      { code: 'INVALID_PARENT_ID', statusCode: 422 }
    )
  }
}

async function wouldCreateCycle(departmentId: string, newParentId: string): Promise<boolean> {
  if (newParentId === departmentId) return true
  let current: string | null = newParentId
  const seen = new Set<string>()
  while (current) {
    if (current === departmentId) return true
    if (seen.has(current)) return true
    seen.add(current)
    const row: { parentId: string | null } | undefined = await db.query.departments.findFirst({
      where: eq(departments.id, current),
      columns: { parentId: true },
    })
    if (!row) break
    current = row.parentId
  }
  return false
}

async function assertActiveManager(managerId: string): Promise<void> {
  const e = await db.query.employees.findFirst({ where: eq(employees.id, managerId) })
  if (!e || e.status !== 'active') {
    throw new ValidationError(
      { managerId: ['ไม่พบพนักงานหรือสถานะไม่ active'] },
      'ข้อมูลไม่ถูกต้อง',
      { code: 'INVALID_MANAGER_ID', statusCode: 422 }
    )
  }
}

export const DepartmentService = {
  async list(query: ListDepartmentQuery): Promise<PaginatedResult<Department>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = []
    if (query.search?.trim()) {
      conditions.push(ilike(departments.name, `%${query.search.trim()}%`))
    }
    if (query.parentId !== undefined && query.parentId !== '') {
      conditions.push(eq(departments.parentId, query.parentId))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(departments)
        .where(where)
        .orderBy(asc(departments.name))
        .limit(perPage)
        .offset(offset),
      db.select({ count: count() }).from(departments).where(where),
    ])

    const total = Number(totalResult[0]?.count ?? 0)

    return {
      data: rows as Department[],
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage) || 0,
      },
    }
  },

  async getById(id: string): Promise<DepartmentDetail> {
    const dept = await db.query.departments.findFirst({ where: eq(departments.id, id) })
    if (!dept) {
      throw new NotFoundError('แผนก', { code: 'DEPT_NOT_FOUND', message: 'ไม่พบแผนก' })
    }

    const parent = dept.parentId
      ? await db.query.departments.findFirst({
          where: eq(departments.id, dept.parentId),
          columns: { name: true },
        })
      : null

    const manager = dept.managerId
      ? await db.query.employees.findFirst({
          where: eq(employees.id, dept.managerId),
          columns: { firstnameTh: true, lastnameTh: true },
        })
      : null

    const [childC, posC] = await Promise.all([
      db.select({ count: count() }).from(departments).where(eq(departments.parentId, id)),
      db.select({ count: count() }).from(positions).where(eq(positions.departmentId, id)),
    ])

    return {
      ...(dept as Department),
      parentName: parent?.name ?? null,
      managerName: manager ? `${manager.firstnameTh} ${manager.lastnameTh}`.trim() : null,
      childrenCount: Number(childC[0]?.count ?? 0),
      positionsCount: Number(posC[0]?.count ?? 0),
    }
  },

  async create(payload: CreateDepartmentPayload): Promise<Department> {
    if (payload.parentId) {
      await assertParentExists(payload.parentId)
      await assertNewDepthOk(payload.parentId)
    }
    if (payload.managerId) {
      await assertActiveManager(payload.managerId)
    }

    const code = await nextDeptCode()
    const [created] = await db
      .insert(departments)
      .values({
        code,
        name: payload.name,
        description: payload.description ?? null,
        parentId: payload.parentId ?? null,
        managerId: payload.managerId ?? null,
      })
      .returning()
    if (!created) {
      throw new ValidationError({ name: ['สร้างแผนกไม่สำเร็จ'] }, 'ข้อมูลไม่ถูกต้อง', { statusCode: 422 })
    }
    return created as Department
  },

  async update(id: string, payload: UpdateDepartmentPayload): Promise<Department> {
    const existing = await db.query.departments.findFirst({ where: eq(departments.id, id) })
    if (!existing) {
      throw new NotFoundError('แผนก', { code: 'DEPT_NOT_FOUND', message: 'ไม่พบแผนก' })
    }

    if (payload.parentId !== undefined) {
      if (payload.parentId === null) {
        // root
      } else {
        await assertParentExists(payload.parentId)
        if (await wouldCreateCycle(id, payload.parentId)) {
          throw new ValidationError(
            { parentId: ['ไม่สามารถตั้งแผนกแม่เป็นลูกหลานของตัวเองได้'] },
            'ข้อมูลไม่ถูกต้อง',
            { code: 'CIRCULAR_HIERARCHY', statusCode: 422 }
          )
        }
        await assertNewDepthOk(payload.parentId)
      }
    }

    if (payload.managerId !== undefined && payload.managerId !== null) {
      await assertActiveManager(payload.managerId)
    }

    const [updated] = await db
      .update(departments)
      .set({
        updatedAt: new Date(),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.parentId !== undefined ? { parentId: payload.parentId } : {}),
        ...(payload.managerId !== undefined ? { managerId: payload.managerId } : {}),
      })
      .where(eq(departments.id, id))
      .returning()
    if (!updated) {
      throw new NotFoundError('แผนก', { code: 'DEPT_NOT_FOUND', message: 'ไม่พบแผนก' })
    }
    return updated as Department
  },

  async remove(id: string): Promise<void> {
    const existing = await db.query.departments.findFirst({ where: eq(departments.id, id) })
    if (!existing) {
      throw new NotFoundError('แผนก', { code: 'DEPT_NOT_FOUND', message: 'ไม่พบแผนก' })
    }

    const [activeEmp] = await db
      .select({ count: count() })
      .from(employees)
      .where(and(eq(employees.departmentId, id), eq(employees.status, 'active')))
    if (Number(activeEmp?.count ?? 0) > 0) {
      throw new ConflictError('DEPT_HAS_EMPLOYEES', 'แผนกยังมีพนักงาน active อยู่')
    }

    const [childC] = await db
      .select({ count: count() })
      .from(departments)
      .where(eq(departments.parentId, id))
    if (Number(childC?.count ?? 0) > 0) {
      throw new ConflictError('DEPT_HAS_CHILDREN', 'แผนกยังมีหน่วยงานย่อย')
    }

    const [posC] = await db
      .select({ count: count() })
      .from(positions)
      .where(eq(positions.departmentId, id))
    if (Number(posC?.count ?? 0) > 0) {
      throw new ConflictError('DEPT_HAS_POSITIONS', 'แผนกยังมีตำแหน่งงาน')
    }

    await db.delete(departments).where(eq(departments.id, id))
  },
}
