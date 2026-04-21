import { Elysia } from 'elysia'

// ============================================================
// error.middleware.ts — Global error handler
// ============================================================

function detailsToFields(details?: Record<string, string[]>): Record<string, string> | undefined {
  if (!details) return undefined
  const fields: Record<string, string> = {}
  for (const [k, arr] of Object.entries(details)) {
    if (arr?.[0]) fields[k] = arr[0]
  }
  return Object.keys(fields).length > 0 ? fields : undefined
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, string[]>,
    public readonly fields?: Record<string, string>,
    public readonly conflict?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, options?: { code?: string; message?: string }) {
    const code =
      options?.code ?? `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`
    super(code, options?.message ?? `ไม่พบ ${resource}`, 404)
  }
}

export class ValidationError extends AppError {
  constructor(
    details: Record<string, string[]>,
    message = 'ข้อมูลไม่ถูกต้อง',
    options?: { code?: string; statusCode?: number }
  ) {
    const fields = detailsToFields(details)
    const code = options?.code ?? 'VALIDATION_ERROR'
    const statusCode = options?.statusCode ?? 400
    super(code, message, statusCode, details, fields)
  }
}

export class ConflictError extends AppError {
  constructor(
    code: string,
    message: string,
    fields?: Record<string, string>,
    conflict?: Record<string, unknown>
  ) {
    super(code, message, 409, undefined, fields, conflict)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e01\u0e48\u0e2d\u0e19') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '\u0e04\u0e38\u0e13\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49') {
    super('FORBIDDEN', message, 403)
  }
}

export const errorMiddleware = new Elysia({ name: 'error-middleware' }).onError(
  ({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode
      const fields = error.fields ?? detailsToFields(error.details)
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(fields ? { fields } : {}),
          ...(error.conflict ? { conflict: error.conflict } : {}),
        },
      }
    }

    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg.includes('Validation')) {
      set.status = 400
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ข้อมูลไม่ถูกต้อง',
        },
      }
    }

    console.error('[UNHANDLED ERROR]', error)
    set.status = 500
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e20\u0e32\u0e22\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a',
      },
    }
  }
)
