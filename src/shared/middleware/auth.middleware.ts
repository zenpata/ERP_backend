import { Elysia } from 'elysia'
import { jwtVerify, type JWTPayload } from 'jose'
import { UnauthorizedError } from './error.middleware'

// ============================================================
// auth.middleware.ts — JWT verify + decode
// ============================================================

export type AuthContextUser = {
  userId: string
  email: string
  roles: string[]
}

type JwtAuthPayload = JWTPayload & {
  email?: string
  roles?: string[]
}

const getSecret = (): Uint8Array => {
  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return new TextEncoder().encode(secret)
}

// `as: 'global'` — required in Elysia 1.4+ so `user` reaches handlers inside nested `.use()`
// route plugins (dashboard, notifications, finance RBAC, etc.) under `/api`.
// app.ts mounts this plugin once on the protected subtree; public `/auth/login` stays outside.
export const authMiddleware = new Elysia({ name: 'auth-middleware' }).derive(
  { as: 'global' },
  async ({ headers }): Promise<{ user: AuthContextUser }> => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError()
    }

    const token = authHeader.slice(7)
    try {
      const { payload } = await jwtVerify(token, getSecret())
      const p = payload as JwtAuthPayload
      const userId = (p.sub as string | undefined) ?? ''
      const email = typeof p.email === 'string' ? p.email : ''
      const roles = Array.isArray(p.roles) ? (p.roles as string[]).filter((r) => typeof r === 'string') : []

      if (!userId || !email) {
        throw new UnauthorizedError('Token ไม่ถูกต้อง')
      }

      return {
        user: {
          userId,
          email,
          roles,
        },
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e
      throw new UnauthorizedError('Token หมดอายุหรือไม่ถูกต้อง')
    }
  }
)
