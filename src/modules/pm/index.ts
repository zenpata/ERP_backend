import { Elysia } from 'elysia'
import { budgetRoutes } from './submodules/budget/budget.routes'
import { globalDashboardRoutes } from './submodules/dashboard/global-dashboard.routes'
import { expenseRoutes } from './submodules/expense/expense.routes'
import { progressRoutes } from './submodules/progress/progress.routes'

// ============================================================
// pm/index.ts — Project Management module plugin
// prefix: /api/pm
// ============================================================

export const pmModule = new Elysia({ prefix: '/pm' })
  .use(budgetRoutes)
  .use(expenseRoutes)
  .use(progressRoutes)
  .use(globalDashboardRoutes)
  .get('/health', () => ({ success: true, data: { module: 'pm', status: 'ok' } }))
