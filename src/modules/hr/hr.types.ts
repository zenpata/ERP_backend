// ============================================================
// hr.types.ts — TypeScript types สำหรับ HR module
// ============================================================

export type EmploymentStatus = 'active' | 'resigned' | 'terminated' | 'on_leave'
export type Gender = 'male' | 'female' | 'other'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern'

export type Employee = {
  id: string
  code: string
  firstnameTh: string
  lastnameTh: string
  firstnameEn: string | null
  lastnameEn: string | null
  nationalId: string
  gender: Gender
  birthDate: Date
  employmentType: EmploymentType
  status: EmploymentStatus
  startDate: Date
  endDate: Date | null
  departmentId: string | null
  positionId: string | null
  baseSalary: string
  createdAt: Date
  updatedAt: Date
}

export type CreateEmployeePayload = {
  firstnameTh: string
  lastnameTh: string
  firstnameEn?: string
  lastnameEn?: string
  nationalId: string
  gender: Gender
  birthDate: Date
  employmentType: EmploymentType
  startDate: Date
  departmentId?: string
  positionId?: string
  baseSalary: string
}

export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'nationalId'>>

export type ListEmployeeQuery = {
  page?: number
  perPage?: number
  search?: string
  departmentId?: string
  status?: EmploymentStatus
}
