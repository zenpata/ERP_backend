// ============================================================
// auth.types.ts — API shapes aligned with erp_frontend AuthMeUser
// ============================================================

export type AuthMeResponse = {
  id: string
  email: string
  name?: string
  employee?: { id: string; name: string; code: string }
  roles: string[]
  permissions: string[]
  /** พนักงานใหม่ / reset — บังคับเปลี่ยนรหัสก่อนใช้งาน (SCN-01) */
  mustChangePassword?: boolean
  createdAt?: string
  updatedAt?: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: AuthMeResponse
}
