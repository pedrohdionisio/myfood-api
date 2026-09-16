import type { FastifyError } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError
} from 'fastify-type-provider-zod'
import { AppError, GENERIC_USER_MESSAGE } from '@/domain/errors.js'
import type { App } from './app.js'

export function registerErrorHandler(app: App): void {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      code: 'NOT_FOUND',
      message: 'Não encontramos o que você procura.',
      requestId: request.id
    })
  })

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      reply.status(422).send({
        code: 'VALIDATION_ERROR',
        message: 'Alguns campos estão inválidos.',
        details: error.validation,
        requestId: request.id
      })
      return
    }

    // A resposta não bate com o schema declarado. É bug nosso, e é o que impede um campo
    // não declarado — delivery_code acima de tudo — de chegar ao cliente.
    if (isResponseSerializationError(error)) {
      request.log.error(
        { err: error, route: `${request.method} ${request.routeOptions.url}` },
        'response does not match its schema'
      )
      reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: GENERIC_USER_MESSAGE,
        requestId: request.id
      })
      return
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error }, 'application error')
      } else {
        request.log.info({ err: error }, 'application error')
      }

      reply.status(error.statusCode).send({
        code: error.code,
        message: error.userMessage,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId: request.id
      })
      return
    }

    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      reply.status(error.statusCode).send({
        code: error.code ?? 'BAD_REQUEST',
        message: GENERIC_USER_MESSAGE,
        requestId: request.id
      })
      return
    }

    request.log.error({ err: error }, 'unhandled error')
    reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: GENERIC_USER_MESSAGE,
      requestId: request.id
    })
  })
}
