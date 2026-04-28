import type { Route } from '@playwright/test'
import { fulfillJson, ok } from '../auth-api-mock'

export function getApiPath(url: string): string {
  const { pathname } = new URL(url)
  const idx = pathname.indexOf('/api/')
  if (idx < 0) return pathname
  return pathname.slice(idx + 4)
}

export function getSearchParams(url: string) {
  return new URL(url).searchParams
}

export function paginate<T>(rows: T[], page = 1, perPage = 20) {
  const start = Math.max(0, (page - 1) * perPage)
  const end = start + perPage
  const data = rows.slice(start, end)
  return {
    data,
    meta: {
      page,
      perPage,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / perPage)),
    },
  }
}

export function listPagingFromUrl(url: string) {
  const sp = getSearchParams(url)
  const page = Number(sp.get('page') ?? '1') || 1
  const perPage = Number(sp.get('perPage') ?? sp.get('limit') ?? '20') || 20
  return { page, perPage }
}

export async function okJson(route: Route, data: unknown, status = 200) {
  await fulfillJson(route, status, ok(data))
}

export async function listJson(
  route: Route,
  rows: unknown[],
  page: number,
  perPage: number,
  status = 200,
) {
  const { data, meta } = paginate(rows, page, perPage)
  await fulfillJson(route, status, { success: true, data, meta })
}

export function parseBody<T extends Record<string, unknown>>(route: Route): T {
  try {
    return route.request().postDataJSON() as T
  } catch {
    return {} as T
  }
}

export function containsText(value: string, q: string) {
  return value.toLowerCase().includes(q.toLowerCase())
}

