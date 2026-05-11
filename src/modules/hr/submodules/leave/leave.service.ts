import Decimal from 'decimal.js'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { getPermissionsForUser } from '../../../auth/auth.service'
import { db } from '../../../../shared/db/client'
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/middleware/error.middleware'
import type { PaginatedResult } from '../../../../shared/types/common.types'
import { employees, leaveBalances, leaveRequests, leaveTypes, users } from '../../hr.schema'

export type LeaveListRow = {
  id: string
  employeeId: string
  employeeCode: string
  employeeFirstname: string
  employeeLastname: string
  leaveTypeId: string
  leaveTypeCode: string
  leaveTypeName: string
  startDate: string
  endDate: string
  daysCount: string
  status: string
  reason: string | null
  rejectionReason: string | null
  createdAt: Date
}

function inclusiveDaysCount(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    throw new ValidationError({ dates: ['Invalid date format'] })
  }
  if (e < s) {
    throw new ValidationError({ dates: ['End date must be on or after start date'] })
  }
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
  return String(diff)
}

async function employeeIdForUser(userId: string): Promise<string | null> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) })
  return u?.employeeId ?? null
}

export const LeaveService = {
  async listTypes() {
    return db
      .select({
        id: leaveTypes.id,
        code: leaveTypes.code,
        name: leaveTypes.name,
        maxDaysPerYear: leaveTypes.maxDaysPerYear,
        isActive: leaveTypes.isActive,
      })
      .from(leaveTypes)
      .where(eq(leaveTypes.isActive, true))
      .orderBy(leaveTypes.code)
  },

  async list(
    userId: string,
    query: {
      page?: number
      perPage?: number
      status?: string
      employeeId?: string
    }
  ): Promise<PaginatedResult<LeaveListRow>> {
    const perms = await getPermissionsForUser(userId)
    const canViewAll = perms.includes('hr:leave:view')
    const canViewSelf = perms.includes('hr:leave:view_self')
    if (!canViewAll && !canViewSelf) {
      throw new ForbiddenError()
    }

    const page = query.page ?? 1
    const perPage = Math.min(query.perPage ?? 20, 100)
    const offset = (page - 1) * perPage

    const conditions = []
    if (query.status) {
      conditions.push(eq(leaveRequests.status, query.status))
    }

    let filterEmployeeId: string | undefined
    if (!canViewAll && canViewSelf) {
      const eid = await employeeIdForUser(userId)
      if (!eid) throw new ForbiddenError()
      filterEmployeeId = eid
    } else if (query.employeeId) {
      filterEmployeeId = query.employeeId
    }

    if (filterEmployeeId) {
      conditions.push(eq(leaveRequests.employeeId, filterEmployeeId))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const base = db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        employeeCode: employees.code,
        employeeFirstname: employees.firstnameTh,
        employeeLastname: employees.lastnameTh,
        leaveTypeId: leaveRequests.leaveTypeId,
        leaveTypeCode: leaveTypes.code,
        leaveTypeName: leaveTypes.name,
        startDate: sql<string>`${leaveRequests.startDate}::text`,
        endDate: sql<string>`${leaveRequests.endDate}::text`,
        daysCount: leaveRequests.daysCount,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
        // legacy schema has no rejection_reason column
        rejectionReason: sql<string | null>`NULL`,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(where)
      .orderBy(desc(leaveRequests.createdAt))

    const [data, totalResult] = await Promise.all([
      base.limit(perPage).offset(offset),
      db
        .select({ count: count() })
        .from(leaveRequests)
        .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
        .where(where),
    ])

    const total = Number(totalResult[0]?.count ?? 0)

    return {
      data: data as LeaveListRow[],
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage) || 1,
      },
    }
  },

  async create(
    userId: string,
    body: {
      leaveTypeId: string
      startDate: string
      endDate: string
      reason?: string
      documentUrl?: string
      employeeId?: string
    }
  ) {
    const perms = await getPermissionsForUser(userId)
    if (!perms.includes('hr:leave:create')) {
      throw new ForbiddenError()
    }

    const canViewAll = perms.includes('hr:leave:view')
    let targetEmployeeId: string
    if (body.employeeId) {
      if (!canViewAll) {
        throw new ForbiddenError()
      }
      targetEmployeeId = body.employeeId
    } else {
      const eid = await employeeIdForUser(userId)
      if (!eid) {
        throw new ValidationError({ employeeId: ['No employee profile linked to this user'] })
      }
      targetEmployeeId = eid
    }

    const lt = await db.query.leaveTypes.findFirst({
      where: eq(leaveTypes.id, body.leaveTypeId),
    })
    if (!lt || !lt.isActive) {
      throw new ValidationError({ leaveTypeId: ['Invalid or inactive leave type'] })
    }

    const daysCount = inclusiveDaysCount(body.startDate, body.endDate)

    const [row] = await db
      .insert(leaveRequests)
      .values({
        employeeId: targetEmployeeId,
        leaveTypeId: body.leaveTypeId,
        startDate: body.startDate,
        endDate: body.endDate,
        daysCount,
        reason: body.reason ?? null,
        status: 'pending',
      })
      .returning()

    if (!row) throw new Error('Failed to create leave request')
    return row
  },

  async approve(userId: string, id: string) {
    const perms = await getPermissionsForUser(userId)
    if (!perms.includes('hr:leave:approve')) {
      throw new ForbiddenError()
    }

    const row = await db.query.leaveRequests.findFirst({
      where: eq(leaveRequests.id, id),
    })
    if (!row) throw new NotFoundError('leave request')
    if (row.status !== 'pending') {
      throw new ValidationError({ status: ['Only pending requests can be approved'] })
    }

    const approverEmpId = await employeeIdForUser(userId)

    // ตรวจสอบและหัก leave balance ใน transaction เดียวกัน
    const updated = await db.transaction(async (tx) => {
      const year = new Date().getFullYear()
      const balance = await tx.query.leaveBalances.findFirst({
        where: and(
          eq(leaveBalances.employeeId, row.employeeId),
          eq(leaveBalances.leaveTypeId, row.leaveTypeId),
          eq(leaveBalances.year, year),
        ),
      })

      if (balance) {
        const available = new Decimal(balance.entitledDays)
          .plus(balance.carriedOverDays)
          .minus(balance.usedDays)
          .minus(balance.pendingDays)
        const daysNeeded = new Decimal(row.daysCount)

        if (available.lt(daysNeeded)) {
          throw new ValidationError({
            balance: [`วันลาคงเหลือไม่พอ (คงเหลือ ${available.toFixed(1)} วัน)`],
          })
        }

        await tx
          .update(leaveBalances)
          .set({
            usedDays: new Decimal(balance.usedDays).plus(daysNeeded).toFixed(1),
          })
          .where(eq(leaveBalances.id, balance.id))
      }

      const [approved] = await tx
        .update(leaveRequests)
        .set({
          status: 'approved',
          approverId: approverEmpId ?? null,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, id))
        .returning()

      if (!approved) throw new NotFoundError('leave request')
      return approved
    })

    return updated
  },

  async reject(userId: string, id: string, rejectionReason: string) {
    const perms = await getPermissionsForUser(userId)
    if (!perms.includes('hr:leave:approve')) {
      throw new ForbiddenError()
    }

    const reason = rejectionReason.trim()
    if (!reason) {
      throw new ValidationError({ rejectionReason: ['Reason is required'] })
    }

    const row = await db.query.leaveRequests.findFirst({
      where: eq(leaveRequests.id, id),
    })
    if (!row) throw new NotFoundError('leave request')
    if (row.status !== 'pending') {
      throw new ValidationError({ status: ['Only pending requests can be rejected'] })
    }

    const approverEmpId = await employeeIdForUser(userId)

    const [updated] = await db
      .update(leaveRequests)
      .set({
        status: 'rejected',
        approverId: approverEmpId ?? null,
        approvedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id))
      .returning()

    if (!updated) throw new NotFoundError('leave request')
    return updated
  },
}
