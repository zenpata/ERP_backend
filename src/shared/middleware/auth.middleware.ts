import { Elysia } from 'elysia'
import { jwtVerify, type JWTPayload } from 'jose'
import { UnauthorizedError } from './error.middleware'

// ============================================================
// auth.middleware.ts — JWT verify + decode
// ============================================================

type AuthPayload = JWTPayload & {
  userId: string
  email: string
  role: string
}

const getSecret = (): Uint8Array => {
  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return new TextEncoder().encode(secret)
}

export const authMiddleware = new Elysia({ name: 'auth-middleware' }).derive(
  async ({ headers }): Promise<{ user: AuthPayload }> => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError()
    }

    const token = authHeader.slice(7)
    try {
      const { payload } = await jwtVerify(token, getSecret())
      const authPayload = payload as AuthPayload

      if (!authPayload.userId || !authPayload.email || !authPayload.role) {
        throw new UnauthorizedError('Token ไม่ถูกต้อง')
      }

      return { user: authPayload }
    } catch {
      throw new UnauthorizedError('Token หมดอายุหรือไม่ถูกต้อง')
    }
  }
)
