export abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly code: string

  readonly details: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = new.target.name
    this.details = details
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404
  readonly code = 'NOT_FOUND'
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403
  readonly code = 'FORBIDDEN'
}

export class ConflictError extends AppError {
  readonly statusCode = 409
  readonly code = 'CONFLICT'
}

export class DomainError extends AppError {
  readonly statusCode = 422
  readonly code = 'DOMAIN_ERROR'
}
