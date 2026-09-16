import type { FastifyError } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError
} from 'fastify-type-provider-zod'
import { AppError } from '@/shared/errors.js'
import type { ZodFastifyInstance } from '@/shared/fastify.js'

export function registerErrorHandler(app: ZodFastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      requestId: request.id
    })
  })

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'Request does not match the expected schema',
        details: error.validation,
        requestId: request.id
      })
      return
    }

    if (isResponseSerializationError(error)) {
      request.log.error(
        { err: error, route: `${request.method} ${request.routeOptions.url}` },
        'response does not match its schema'
      )
      reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: request.id
      })
      return
    }

    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId: request.id
      })
      return
    }

    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      reply.status(error.statusCode).send({
        error: error.code ?? 'BAD_REQUEST',
        message: error.message,
        requestId: request.id
      })
      return
    }

    request.log.error({ err: error }, 'unhandled error')
    reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId: request.id
    })
  })
}
