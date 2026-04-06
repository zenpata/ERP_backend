import { Elysia } from 'elysia'

// ============================================================
// pm/index.ts — Project Management module plugin
// prefix: /api/pm
// ============================================================

// TODO: เพิ่ม routes เมื่อ implement submodule แต่ละตัวแล้ว
// import { projectRoutes } from './submodules/project/project.routes'
// import { taskRoutes } from './submodules/task/task.routes'
// import { milestoneRoutes } from './submodules/milestone/milestone.routes'
// import { timesheetRoutes } from './submodules/timesheet/timesheet.routes'

export const pmModule = new Elysia({ prefix: '/pm' })
  .get('/health', () => ({ success: true, data: { module: 'pm', status: 'ok' } }))
// .use(projectRoutes)
// .use(taskRoutes)
// .use(milestoneRoutes)
// .use(timesheetRoutes)
