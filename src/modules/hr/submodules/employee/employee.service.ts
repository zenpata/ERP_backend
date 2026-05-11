import { and, count, eq, ilike, max, or } from 'drizzle-orm'
import { db } from '../../../../shared/db/client'
import { validateNationalId } from '../../../../shared/utils/thai-id'
import { NotFoundError, ValidationError } from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { employees, users } from '../../hr.schema'
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
    if (query.employmentType) {
      conditions.push(eq(employees.employmentType, query.employmentType))
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
        nickname: payload.nickname ?? null,
        nationalId: payload.nationalId,
        gender: payload.gender,
        birthDate: payload.birthDate,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        address: payload.address ?? null,
        employmentType: payload.employmentType,
        startDate: payload.startDate,
        endDate: payload.endDate ?? null,
        departmentId: payload.departmentId ?? null,
        positionId: payload.positionId ?? null,
        managerId: payload.managerId ?? null,
        baseSalary: payload.baseSalary,
        bankName: payload.bankName ?? null,
        bankAccountNumber: payload.bankAccountNumber ?? null,
        bankAccountName: payload.bankAccountName ?? null,
        ssEnrolled: payload.ssEnrolled ?? true,
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

  /** Soft terminate: status + end date (Asia/Bangkok calendar day). */
  async terminate(id: string): Promise<void> {
    await EmployeeService.getById(id)
    const endDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    await db
      .update(employees)
      .set({
        status: 'terminated',
        endDate,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
  },

  async getByUserId(userId: string): Promise<Employee> {
    const u = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })
    if (!u?.employeeId) {
      throw new NotFoundError('employee')
    }
    return EmployeeService.getById(u.employeeId)
  },
}

async function generateEmployeeCode(): Promise<string> {
  const result = await db.select({ maxCode: max(employees.code) }).from(employees)
  const maxCode = result[0]?.maxCode
  const next = maxCode ? parseInt(maxCode, 10) + 1 : 1
  return String(next).padStart(4, '0')
}
