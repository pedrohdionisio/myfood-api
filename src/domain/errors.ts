export const GENERIC_USER_MESSAGE = 'Não foi possível concluir a ação. Tente novamente.'

export abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly code: string

  readonly userMessage: string
  readonly details: unknown

  constructor(message: string, userMessage: string = GENERIC_USER_MESSAGE, details?: unknown) {
    super(message)
    this.name = new.target.name
    this.userMessage = userMessage
    this.details = details
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401
  readonly code = 'UNAUTHORIZED'

  constructor(message = 'Não autenticado.', userMessage = 'Sua sessão expirou. Entre novamente.') {
    super(message, userMessage)
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403
  readonly code = 'FORBIDDEN'

  constructor(
    message = 'Sem permissão para esta operação.',
    userMessage = 'Você não tem permissão para fazer isso.'
  ) {
    super(message, userMessage)
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404
  readonly code = 'NOT_FOUND'

  constructor(
    message = 'Recurso não encontrado.',
    userMessage = 'Não encontramos o que você procura.'
  ) {
    super(message, userMessage)
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409
  readonly code = 'CONFLICT'
}

/** Regra de negócio violada. A mensagem técnica já é escrita para o usuário. */
export class DomainError extends AppError {
  readonly statusCode = 422
  readonly code = 'DOMAIN_ERROR'

  constructor(message: string, userMessage: string = message, details?: unknown) {
    super(message, userMessage, details)
  }
}
