import { Elysia } from 'elysia'

// ============================================================
// finance/index.ts — Finance module plugin
// prefix: /api/finance
// ============================================================

// TODO: เพิ่ม routes เมื่อ implement submodule แต่ละตัวแล้ว
// import { arRoutes } from './submodules/ar/ar.routes'
// import { apRoutes } from './submodules/ap/ap.routes'
// import { glRoutes } from './submodules/gl/gl.routes'
// import { assetsRoutes } from './submodules/assets/assets.routes'
// import { reportsRoutes } from './submodules/reports/reports.routes'

export const financeModule = new Elysia({ prefix: '/finance' })
  .get('/health', () => ({ success: true, data: { module: 'finance', status: 'ok' } }))
// .use(arRoutes)
// .use(apRoutes)
// .use(glRoutes)
// .use(assetsRoutes)
// .use(reportsRoutes)
