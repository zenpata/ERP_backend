import type { Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { apiUrlGlob, fulfillJson } from '../auth-api-mock'
import { makeLocalId, type MockErpState } from '../realistic-data'
import { containsText, getApiPath, listJson, listPagingFromUrl, okJson, parseBody } from './common'

function summaryFromBudgetsAndExpenses(state: MockErpState, budgetId: string) {
  const budget = state.budgets.find((b) => b.id === budgetId)
  const totalBudget = Number(budget?.totalAmount ?? 0)
  const linked = state.expenses.filter((x) => x.budgetId === budgetId && (x.status === 'Approved' || x.status === 'Paid'))
  const spent = linked.reduce((sum, e) => sum + Number(e.amount), 0)
  const remaining = Math.max(0, totalBudget - spent)
  const utilizationPct = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0
  const categoryMap = new Map<string, number>()
  for (const row of linked) {
    categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + Number(row.amount))
  }
  return {
    totalBudget,
    spent,
    remaining,
    utilizationPct,
    byCategory: Array.from(categoryMap.entries()).map(([category, value]) => ({ category, spent: value })),
  }
}

export async function installPmMockRouter(page: Page, state: MockErpState) {
  await page.route(apiUrlGlob('pm/**'), async (route) => {
    const req = route.request()
    const method = req.method()
    const url = req.url()
    const path = getApiPath(url)
    const sp = new URL(url).searchParams

    // Budgets
    if (method === 'GET' && path === '/pm/budgets') {
      const search = (sp.get('search') ?? '').trim()
      const status = sp.get('status') ?? ''
      const rows = state.budgets.filter((x) => {
        if (status && x.status !== status) return false
        if (search && !containsText(`${x.budgetCode} ${x.projectName}`, search)) return false
        return true
      })
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/pm/budgets') {
      const body = parseBody<{
        budgetType?: string
        projectName?: string
        totalAmount?: string
        ownerName?: string
        startDate?: string
        endDate?: string
      }>(route)
      if (!body.budgetType || !body.projectName || !body.totalAmount || !body.ownerName || !body.startDate || !body.endDate) {
        await fulfillJson(route, 422, { success: false, message: 'missing required fields', statusCode: 422 })
        return
      }
      if (body.endDate < body.startDate) {
        await fulfillJson(route, 422, { success: false, message: 'endDate must be >= startDate', statusCode: 422 })
        return
      }
      const created = {
        id: randomUUID(),
        budgetCode: `BUD-2026-${String(state.budgets.length + 1).padStart(3, '0')}`,
        projectName: body.projectName,
        totalAmount: body.totalAmount,
        budgetType: body.budgetType,
        moduleTags: [],
        ownerName: body.ownerName,
        status: 'Draft' as const,
        startDate: body.startDate,
        endDate: body.endDate,
        spentAmount: '0',
      }
      state.budgets.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'GET' && path.match(/^\/pm\/budgets\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.budgets.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      await okJson(route, row)
      return
    }
    if (method === 'PUT' && path.match(/^\/pm\/budgets\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.budgets.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      const body = parseBody<Record<string, unknown>>(route)
      Object.assign(row, body)
      await okJson(route, row)
      return
    }
    if (method === 'PATCH' && path.match(/^\/pm\/budgets\/[^/]+\/status$/)) {
      const id = path.split('/')[3]
      const body = parseBody<{ status?: string }>(route)
      const row = state.budgets.find((x) => x.id === id)
      if (!row || !body.status) {
        await fulfillJson(route, 422, { success: false, message: 'invalid status', statusCode: 422 })
        return
      }
      row.status = body.status as typeof row.status
      await okJson(route, row)
      return
    }
    if (method === 'DELETE' && path.match(/^\/pm\/budgets\/[^/]+$/)) {
      const id = path.split('/')[3]
      const idx = state.budgets.findIndex((x) => x.id === id)
      if (idx < 0) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      if (state.budgets[idx].status !== 'Draft') {
        await fulfillJson(route, 422, { success: false, message: 'delete only draft', statusCode: 422 })
        return
      }
      state.budgets.splice(idx, 1)
      await okJson(route, null)
      return
    }
    if (method === 'GET' && path.match(/^\/pm\/budgets\/[^/]+\/summary$/)) {
      const id = path.split('/')[3]
      await okJson(route, summaryFromBudgetsAndExpenses(state, id))
      return
    }

    // Expenses
    if (method === 'GET' && path === '/pm/expenses') {
      const search = (sp.get('search') ?? '').trim()
      const status = sp.get('status') ?? ''
      const budgetId = sp.get('budgetId') ?? ''
      const sortBy = sp.get('sortBy') ?? ''
      const sortDirection = sp.get('sortDirection') ?? 'desc'
      const rows = state.expenses.filter((x) => {
        if (status && x.status !== status) return false
        if (budgetId && x.budgetId !== budgetId) return false
        if (search && !containsText(`${x.title} ${x.requestedByName} ${x.category}`, search)) return false
        return true
      })
      if (sortBy) {
        rows.sort((a, b) => {
          const aValue = (a as Record<string, string>)[sortBy] ?? ''
          const bValue = (b as Record<string, string>)[sortBy] ?? ''
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
          return 0
        })
      }
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'POST' && path === '/pm/expenses') {
      const body = parseBody<{
        title?: string
        budgetId?: string
        amount?: string
        expenseDate?: string
        category?: string
        paymentMethod?: string
        requestedByName?: string
      }>(route)
      if (!body.title || !body.budgetId || !body.amount || !body.expenseDate || !body.category || !body.paymentMethod || !body.requestedByName) {
        await fulfillJson(route, 422, { success: false, message: 'missing required fields', statusCode: 422 })
        return
      }
      const budget = state.budgets.find((x) => x.id === body.budgetId)
      if (!budget || budget.status !== 'Active') {
        await fulfillJson(route, 422, { success: false, message: 'budget is not active', statusCode: 422 })
        return
      }
      const created = {
        id: makeLocalId('exp', state.expenses),
        title: body.title,
        budgetId: body.budgetId,
        amount: body.amount,
        expenseDate: body.expenseDate,
        category: body.category,
        paymentMethod: body.paymentMethod,
        status: 'Draft' as const,
        requestedByName: body.requestedByName,
      }
      state.expenses.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'GET' && path.match(/^\/pm\/expenses\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.expenses.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      await okJson(route, row)
      return
    }
    if (method === 'PUT' && path.match(/^\/pm\/expenses\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.expenses.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      if (row.status !== 'Draft' && row.status !== 'Rejected') {
        await fulfillJson(route, 422, { success: false, message: 'cannot edit status', statusCode: 422 })
        return
      }
      const body = parseBody<Record<string, unknown>>(route)
      Object.assign(row, body)
      await okJson(route, row)
      return
    }
    if (method === 'PATCH' && path.match(/^\/pm\/expenses\/[^/]+\/status$/)) {
      const id = path.split('/')[3]
      const row = state.expenses.find((x) => x.id === id)
      const body = parseBody<{ status?: string; note?: string }>(route)
      if (!row || !body.status) {
        await fulfillJson(route, 422, { success: false, message: 'invalid status', statusCode: 422 })
        return
      }
      row.status = body.status as typeof row.status
      if (row.status === 'Approved' || row.status === 'Paid') {
        const budget = state.budgets.find((x) => x.id === row.budgetId)
        if (budget) {
          budget.spentAmount = String((Number(budget.spentAmount ?? '0') + Number(row.amount)).toFixed(2))
        }
      }
      await okJson(route, row)
      return
    }
    if (method === 'DELETE' && path.match(/^\/pm\/expenses\/[^/]+$/)) {
      const id = path.split('/')[3]
      const idx = state.expenses.findIndex((x) => x.id === id)
      if (idx < 0) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      if (state.expenses[idx].status !== 'Draft') {
        await fulfillJson(route, 422, { success: false, message: 'can delete draft only', statusCode: 422 })
        return
      }
      state.expenses.splice(idx, 1)
      await okJson(route, null)
      return
    }

    // Progress
    if (method === 'GET' && path === '/pm/progress') {
      const search = (sp.get('search') ?? '').trim()
      const rows = state.tasks.filter((task) => (search ? containsText(`${task.title} ${task.assigneeName}`, search) : true))
      const { page: pageNo, perPage } = listPagingFromUrl(url)
      await listJson(route, rows, pageNo, perPage)
      return
    }
    if (method === 'GET' && path === '/pm/progress/summary') {
      const grouped = new Map<string, { module: string; avgProgress: number; taskCount: number; doneCount: number; totalProgress: number }>()
      for (const task of state.tasks) {
        const current = grouped.get(task.module) ?? {
          module: task.module,
          avgProgress: 0,
          taskCount: 0,
          doneCount: 0,
          totalProgress: 0,
        }
        current.taskCount += 1
        current.totalProgress += task.progressPct
        if (task.status === 'Done') current.doneCount += 1
        grouped.set(task.module, current)
      }
      const byModule = Array.from(grouped.values()).map((x) => ({
        module: x.module,
        taskCount: x.taskCount,
        doneCount: x.doneCount,
        avgProgress: x.taskCount > 0 ? Math.round(x.totalProgress / x.taskCount) : 0,
      }))
      const totalTask = state.tasks.length
      const totalDone = state.tasks.filter((x) => x.status === 'Done').length
      const avg = totalTask > 0 ? Math.round(state.tasks.reduce((s, x) => s + x.progressPct, 0) / totalTask) : 0
      await okJson(route, {
        byModule,
        overall: { avgProgress: avg, taskCount: totalTask, doneCount: totalDone },
      })
      return
    }
    if (method === 'POST' && path === '/pm/progress') {
      const body = parseBody<{
        title?: string
        module?: string
        phase?: string
        status?: 'Not Started' | 'In Progress' | 'Done' | 'On Hold' | 'Cancelled'
        priority?: 'High' | 'Medium' | 'Low'
        progressPct?: number
        startDate?: string
        targetDate?: string
        assigneeName?: string
      }>(route)
      if (!body.title || !body.module || !body.phase || !body.status || !body.priority || body.progressPct == null || !body.startDate || !body.targetDate || !body.assigneeName) {
        await fulfillJson(route, 422, { success: false, message: 'missing required fields', statusCode: 422 })
        return
      }
      const created = {
        id: makeLocalId('task', state.tasks),
        title: body.title,
        module: body.module,
        phase: body.phase,
        status: body.status,
        priority: body.priority,
        progressPct: Number(body.progressPct),
        startDate: body.startDate,
        targetDate: body.targetDate,
        assigneeName: body.assigneeName,
      }
      state.tasks.unshift(created)
      await okJson(route, created, 201)
      return
    }
    if (method === 'GET' && path.match(/^\/pm\/progress\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.tasks.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      await okJson(route, row)
      return
    }
    if (method === 'PUT' && path.match(/^\/pm\/progress\/[^/]+$/)) {
      const id = path.split('/')[3]
      const row = state.tasks.find((x) => x.id === id)
      if (!row) {
        await fulfillJson(route, 404, { success: false, message: 'not found', statusCode: 404 })
        return
      }
      const body = parseBody<Record<string, unknown>>(route)
      if (typeof body.progressPct === 'number' && (body.progressPct < 0 || body.progressPct > 100)) {
        await fulfillJson(route, 422, { success: false, message: 'progress out of range', statusCode: 422 })
        return
      }
      Object.assign(row, body)
      await okJson(route, row)
      return
    }
    if (method === 'DELETE' && path.match(/^\/pm\/progress\/[^/]+$/)) {
      const id = path.split('/')[3]
      const idx = state.tasks.findIndex((x) => x.id === id)
      if (idx >= 0) state.tasks.splice(idx, 1)
      await okJson(route, null)
      return
    }

    // PM global snapshot
    if (method === 'GET' && path === '/pm/global-dashboard/pm-snapshot') {
      await okJson(route, {
        budgetCount: state.budgets.length,
        expenseCount: state.expenses.length,
        openTasks: state.tasks.filter((x) => x.status !== 'Done' && x.status !== 'Cancelled').length,
      })
      return
    }

    await route.continue()
  })
}
