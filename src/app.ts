import 'dotenv/config'
import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { authProtectedRoutes, authPublicRoutes } from './modules/auth'
import { authMiddleware } from './shared/middleware/auth.middleware'
import { hrModule } from './modules/hr'
import { notificationsRoutes, settingsModuleRoutes, settingsRoutes } from './modules/settings'
import { financeModule } from './modules/finance'
import { startApOverdueScheduler } from './modules/finance/ap-overdue.scheduler'
import { dashboardRoutes } from './modules/dashboard'
import { pmModule } from './modules/pm'
import { errorMiddleware } from './shared/middleware/error.middleware'

// ============================================================
// app.ts — Elysia root instance
// ============================================================

const PORT = Number(process.env['PORT'] ?? 3000)

export const app = new Elysia()
  .use(errorMiddleware)
  .use(
    cors({
      origin: process.env['CORS_ORIGIN'] ?? true,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .get('/health', () => ({
    success: true,
    data: {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    },
  }))
  .group('/api', (api) =>
    api
      .use(authPublicRoutes)
      .group('', (protectedApi) =>
        protectedApi
          .use(authMiddleware)
          .use(authProtectedRoutes)
          .use(dashboardRoutes)
          .use(hrModule)
          .use(financeModule)
          .use(pmModule)
          .use(notificationsRoutes)
          .use(settingsModuleRoutes)
          .use(settingsRoutes)
      )
  )
  .listen(PORT)

startApOverdueScheduler()

console.log(`🚀 ERP Backend running at http://localhost:${PORT}`)
console.log(`📋 Health check: http://localhost:${PORT}/health`)
