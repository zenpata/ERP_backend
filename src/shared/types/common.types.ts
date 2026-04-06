// ============================================================
// common.types.ts — shared types สำหรับทุก module
// ============================================================

export type PaginationMeta = {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export type ApiResponse<T> =
  | {
      success: true
      data: T
      meta?: PaginationMeta
    }
  | {
      success: false
      error: {
        code: string
        message: string
        details?: Record<string, string[]>
      }
    }

export type PaginatedResult<T> = {
  data: T[]
  meta: PaginationMeta
}

export type PaginationQuery = {
  page?: number
  perPage?: number
  search?: string
}

// ──── Ref types สำหรับ cross-module communication ────────────
// ห้าม import class จาก module อื่นโดยตรง ใช้ Ref เหล่านี้แทน

export type UserRef = {
  id: string
  email: string
  role: string
}

export type EmployeeRef = {
  id: string
  code: string
  firstnameTh: string
  lastnameTh: string
  departmentId: string | null
}

export type PayrollRef = {
  employeeId: string
  periodYear: number
  periodMonth: number
  grossSalary: string
  netSalary: string
}

export type ProjectRef = {
  id: string
  code: string
  name: string
  status: string
}
