import { Elysia } from 'elysia'

// ============================================================
// error.middleware.ts — Global error handler
// ============================================================

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, `ไม่พบ ${resource}`, 404)
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super('VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', 422, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'กรุณาเข้าสู่ระบบก่อน') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้') {
    super('FORBIDDEN', message, 403)
  }
}

export const errorMiddleware = new Elysia({ name: 'error-middleware' }).onError(
  ({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      }
    }

    // Elysia validation error
    if (error.message.includes('Validation')) {
      set.status = 422
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ข้อมูลไม่ถูกต้อง',
        },
      }
    }

    // unexpected error
    console.error('[UNHANDLED ERROR]', error)
    set.status = 500
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'เกิดข้อผิดพลาดภายในระบบ',
      },
    }
  }
)
