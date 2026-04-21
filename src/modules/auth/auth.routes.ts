import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../shared/middleware/auth.middleware'
import { AuthService, buildAuthMeResponse } from './auth.service'

// ============================================================
// auth.routes.ts — /api/auth/*
// Public routes (no JWT). Protected routes live in authProtectedRoutes
// and are mounted under app after a single authMiddleware (see app.ts).
// ============================================================

export const authPublicRoutes = new Elysia({ prefix: '/auth' })
  .post(
    '/login',
    async ({ body }) => {
      const result = await AuthService.login(body.email, body.password)
      return { success: true, data: result }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .post('/logout', () => ({ success: true, data: null }))
  .post(
    '/refresh',
    async ({ body }) => {
      const tokens = await AuthService.refresh(body.refreshToken)
      return { success: true, data: tokens }
    },
    {
      body: t.Object({
        refreshToken: t.String({ minLength: 1 }),
      }),
    }
  )

export const authProtectedRoutes = new Elysia({ prefix: '/auth' })
  .get('/me', async (ctx) => {
    const { user } = ctx as typeof ctx & { user: AuthContextUser }
    const me = await buildAuthMeResponse(user.userId)
    return { success: true, data: me }
  })
  .patch(
    '/me/password',
    async (ctx) => {
      const { user, body } = ctx as typeof ctx & {
        user: AuthContextUser
        body: { currentPassword: string; newPassword: string }
      }
      await AuthService.changePassword(user.userId, body.currentPassword, body.newPassword)
      return { success: true, data: null }
    },
    {
      body: t.Object({
        currentPassword: t.String({ minLength: 1 }),
        newPassword: t.String({ minLength: 8 }),
      }),
    }
  )
