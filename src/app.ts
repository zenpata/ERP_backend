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
import { features, isEnabled, type ModuleName } from './shared/config/features'

// ============================================================
// app.ts — Elysia root instance
// ============================================================

const PORT = Number(process.env['PORT'] ?? 3000)

// Returns `plugin` when the module is enabled, or an empty Elysia when disabled.
// The cast is intentional — Elysia's generic accumulation doesn't permit
// conditional assignment to `let`, so we erase the type at this boundary.
function gate<T extends Elysia>(plugin: T, name: ModuleName): T {
  return isEnabled(name) ? plugin : (new Elysia() as unknown as T)
}

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
      .get('/config/features', () => ({ success: true, data: features }))
      .group('', (protectedApi) =>
        protectedApi
          .use(authMiddleware)
          .use(authProtectedRoutes)
          .use(gate(dashboardRoutes, 'dashboard'))
          .use(gate(hrModule, 'hr'))
          .use(gate(financeModule, 'finance'))
          .use(gate(pmModule, 'pm'))
          .use(gate(notificationsRoutes, 'notifications'))
          .use(gate(settingsModuleRoutes, 'settings'))
          .use(gate(settingsRoutes, 'settings'))
      )
  )
  .listen(PORT)

if (isEnabled('finance')) startApOverdueScheduler()

console.log(`🚀 ERP Backend running at http://localhost:${PORT}`)
console.log(`📋 Health check: http://localhost:${PORT}/health`)
