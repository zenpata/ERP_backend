import { Elysia, t } from 'elysia'
import type { AuthContextUser } from '../../../../shared/middleware/auth.middleware'
import { requireAnyPermission } from '../../../../shared/middleware/rbac.middleware'
import { EmployeeService } from './employee.service'

// ============================================================
// employee.routes.ts — /api/hr/employees
// ============================================================

const listQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  search: t.Optional(t.String()),
  departmentId: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal('active'),
      t.Literal('resigned'),
      t.Literal('terminated'),
      t.Literal('inactive'),
    ])
  ),
  employmentType: t.Optional(
    t.Union([t.Literal('monthly'), t.Literal('daily'), t.Literal('contract')])
  ),
})

const createBody = t.Object({
  nationalId: t.String({ pattern: '^[0-9]{13}$' }),
  firstnameTh: t.String({ minLength: 1 }),
  lastnameTh: t.String({ minLength: 1 }),
  firstnameEn: t.Optional(t.String()),
  lastnameEn: t.Optional(t.String()),
  nickname: t.Optional(t.String()),
  birthDate: t.String({ format: 'date' }),
  gender: t.Union([t.Literal('male'), t.Literal('female'), t.Literal('other')]),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String({ format: 'email' })),
  address: t.Optional(t.String()),
  departmentId: t.Optional(t.String()),
  positionId: t.Optional(t.String()),
  managerId: t.Optional(t.String()),
  employmentType: t.Union([
    t.Literal('monthly'),
    t.Literal('daily'),
    t.Literal('contract'),
  ]),
  startDate: t.String({ format: 'date' }),
  endDate: t.Optional(t.String({ format: 'date' })),
  baseSalary: t.String({ pattern: '^[0-9]+(\\.[0-9]{1,2})?$' }),
  bankName: t.Optional(t.String()),
  bankAccountNumber: t.Optional(t.String()),
  bankAccountName: t.Optional(t.String()),
  ssEnrolled: t.Optional(t.Boolean()),
})

const patchBody = t.Object({
  firstnameTh: t.Optional(t.String({ minLength: 1 })),
  lastnameTh: t.Optional(t.String({ minLength: 1 })),
  firstnameEn: t.Optional(t.String()),
  lastnameEn: t.Optional(t.String()),
  nickname: t.Optional(t.String()),
  gender: t.Optional(t.Union([t.Literal('male'), t.Literal('female'), t.Literal('other')])),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String({ format: 'email' })),
  address: t.Optional(t.String()),
  departmentId: t.Optional(t.String()),
  positionId: t.Optional(t.String()),
  managerId: t.Optional(t.String()),
  employmentType: t.Optional(
    t.Union([t.Literal('monthly'), t.Literal('daily'), t.Literal('contract')])
  ),
  startDate: t.Optional(t.String({ format: 'date' })),
  baseSalary: t.Optional(t.String({ pattern: '^[0-9]+(\\.[0-9]{1,2})?$' })),
  bankName: t.Optional(t.String()),
  bankAccountNumber: t.Optional(t.String()),
  bankAccountName: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal('active'),
      t.Literal('resigned'),
      t.Literal('terminated'),
      t.Literal('inactive'),
    ])
  ),
  endDate: t.Optional(t.String({ format: 'date' })),
  avatarUrl: t.Optional(t.String()),
})

export const employeeRoutes = new Elysia({ prefix: '/employees' }).get('/me', async (ctx) => {
  const { user } = ctx as typeof ctx & { user: AuthContextUser }
  const employee = await EmployeeService.getByUserId(user.userId)
  return { success: true, data: employee }
})
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:employee:view'))
      .get(
        '/',
        async ({ query }) => {
          const result = await EmployeeService.list(query)
          return { success: true, data: result.data, meta: result.meta }
        },
        { query: listQuery }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:employee:view'))
      .get(
        '/:id',
        async ({ params }) => {
          const employee = await EmployeeService.getById(params.id)
          return { success: true, data: employee }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:employee:create'))
      .post(
        '/',
        async ({ body }) => {
          const employee = await EmployeeService.create(body)
          return { success: true, data: employee }
        },
        { body: createBody }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:employee:edit'))
      .patch(
        '/:id',
        async ({ params, body }) => {
          const employee = await EmployeeService.update(params.id, body)
          return { success: true, data: employee }
        },
        {
          params: t.Object({ id: t.String() }),
          body: patchBody,
        }
      )
  )
  .use(
    new Elysia()
      .use(requireAnyPermission('hr:employee:delete'))
      .delete(
        '/:id',
        async ({ params }) => {
          await EmployeeService.terminate(params.id)
          return { success: true, data: null }
        },
        { params: t.Object({ id: t.String() }) }
      )
  )
