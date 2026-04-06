import { Elysia } from 'elysia'
import { hrModule } from './modules/hr'
import { financeModule } from './modules/finance'
import { pmModule } from './modules/pm'
import { errorMiddleware } from './shared/middleware/error.middleware'

// ============================================================
// app.ts — Elysia root instance
// ============================================================

const PORT = Number(process.env['PORT'] ?? 3000)

export const app = new Elysia()
  .use(errorMiddleware)
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
      .use(hrModule)
      .use(financeModule)
      .use(pmModule)
  )
  .listen(PORT)

console.log(`🚀 ERP Backend running at http://localhost:${PORT}`)
console.log(`📋 Health check: http://localhost:${PORT}/health`)
