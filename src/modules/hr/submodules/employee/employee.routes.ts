import { Elysia, t } from 'elysia'
import { authMiddleware } from '../../../../shared/middleware/auth.middleware'
import { EmployeeService } from './employee.service'

// ============================================================
// employee.routes.ts — /api/hr/employees
// ============================================================

export const employeeRoutes = new Elysia({ prefix: '/employees' })
  .use(authMiddleware)
  .get(
    '/',
    async ({ query }) => {
      const result = await EmployeeService.list(query)
      return { success: true, data: result.data, meta: result.meta }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        perPage: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
        search: t.Optional(t.String()),
        departmentId: t.Optional(t.String()),
        status: t.Optional(
          t.Union([
            t.Literal('active'),
            t.Literal('resigned'),
            t.Literal('terminated'),
            t.Literal('on_leave'),
          ])
        ),
      }),
    }
  )
  .get(
    '/:id',
    async ({ params }) => {
      const employee = await EmployeeService.getById(params.id)
      return { success: true, data: employee }
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    '/',
    async ({ body }) => {
      const employee = await EmployeeService.create({
        ...body,
        birthDate: new Date(body.birthDate),
        startDate: new Date(body.startDate),
      })
      return { success: true, data: employee }
    },
    {
      body: t.Object({
        firstnameTh: t.String({ minLength: 1 }),
        lastnameTh: t.String({ minLength: 1 }),
        firstnameEn: t.Optional(t.String()),
        lastnameEn: t.Optional(t.String()),
        nationalId: t.String({ pattern: '^[0-9]{13}$' }),
        gender: t.Union([t.Literal('male'), t.Literal('female'), t.Literal('other')]),
        birthDate: t.String({ format: 'date' }),
        employmentType: t.Union([
          t.Literal('full_time'),
          t.Literal('part_time'),
          t.Literal('contract'),
          t.Literal('intern'),
        ]),
        startDate: t.String({ format: 'date' }),
        departmentId: t.Optional(t.String()),
        positionId: t.Optional(t.String()),
        baseSalary: t.String({ pattern: '^[0-9]+(\\.[0-9]{1,2})?$' }),
      }),
    }
  )
  .patch(
    '/:id',
    async ({ params, body }) => {
      const employee = await EmployeeService.update(params.id, body)
      return { success: true, data: employee }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        firstnameTh: t.Optional(t.String({ minLength: 1 })),
        lastnameTh: t.Optional(t.String({ minLength: 1 })),
        firstnameEn: t.Optional(t.String()),
        lastnameEn: t.Optional(t.String()),
        gender: t.Optional(
          t.Union([t.Literal('male'), t.Literal('female'), t.Literal('other')])
        ),
        departmentId: t.Optional(t.String()),
        positionId: t.Optional(t.String()),
        baseSalary: t.Optional(t.String({ pattern: '^[0-9]+(\\.[0-9]{1,2})?$' })),
        status: t.Optional(
          t.Union([
            t.Literal('active'),
            t.Literal('resigned'),
            t.Literal('terminated'),
            t.Literal('on_leave'),
          ])
        ),
      }),
    }
  )
