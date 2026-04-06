import { and, count, eq, ilike, or } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { validateNationalId } from '../../../../shared/utils/thai-id'
import { NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { employees } from '../../hr.schema'
import type {
  CreateEmployeePayload,
  Employee,
  ListEmployeeQuery,
  UpdateEmployeePayload,
} from '../../hr.types'

// ============================================================
// employee.service.ts — business logic เกี่ยวกับพนักงาน
// ============================================================

export const EmployeeService = {
  async list(query: ListEmployeeQuery): Promise<PaginatedResult<Employee>> {
    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = []

    if (query.search) {
      conditions.push(
        or(
          ilike(employees.firstnameTh, `%${query.search}%`),
          ilike(employees.lastnameTh, `%${query.search}%`),
          ilike(employees.code, `%${query.search}%`)
        )
      )
    }
    if (query.departmentId) {
      conditions.push(eq(employees.departmentId, query.departmentId))
    }
    if (query.status) {
      conditions.push(eq(employees.status, query.status))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(employees)
        .where(where)
        .limit(perPage)
        .offset(offset),
      db.select({ count: count() }).from(employees).where(where),
    ])

    const total = Number(totalResult[0]?.count ?? 0)

    return {
      data: data as Employee[],
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    }
  },

  async getById(id: string): Promise<Employee> {
    const result = await db.query.employees.findFirst({
      where: eq(employees.id, id),
    })
    if (!result) throw new NotFoundError('employee')
    return result as Employee
  },

  async create(payload: CreateEmployeePayload): Promise<Employee> {
    // ตรวจสอบเลขประจำตัวประชาชน
    if (!validateNationalId(payload.nationalId)) {
      throw new ValidationError({ nationalId: ['เลขประจำตัวประชาชนไม่ถูกต้อง'] })
    }

    // ตรวจสอบว่าเลขซ้ำหรือไม่
    const existing = await db.query.employees.findFirst({
      where: eq(employees.nationalId, payload.nationalId),
    })
    if (existing) {
      throw new ValidationError({ nationalId: ['เลขประจำตัวประชาชนนี้มีอยู่ในระบบแล้ว'] })
    }

    // สร้างรหัสพนักงาน auto
    const code = await generateEmployeeCode()

    const [created] = await db
      .insert(employees)
      .values({
        code,
        firstnameTh: payload.firstnameTh,
        lastnameTh: payload.lastnameTh,
        firstnameEn: payload.firstnameEn ?? null,
        lastnameEn: payload.lastnameEn ?? null,
        nationalId: payload.nationalId,
        gender: payload.gender,
        birthDate: payload.birthDate.toISOString().slice(0, 10),
        employmentType: payload.employmentType,
        startDate: payload.startDate.toISOString().slice(0, 10),
        departmentId: payload.departmentId ?? null,
        positionId: payload.positionId ?? null,
        baseSalary: payload.baseSalary,
      })
      .returning()

    if (!created) throw new Error('ไม่สามารถสร้างข้อมูลพนักงานได้')
    return created as Employee
  },

  async update(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    await EmployeeService.getById(id) // ตรวจสอบว่ามีอยู่

    const [updated] = await db
      .update(employees)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning()

    if (!updated) throw new NotFoundError('employee')
    return updated as Employee
  },
}

async function generateEmployeeCode(): Promise<string> {
  const result = await db.select({ count: count() }).from(employees)
  const total = Number(result[0]?.count ?? 0)
  return `EMP${String(total + 1).padStart(5, '0')}`
}
