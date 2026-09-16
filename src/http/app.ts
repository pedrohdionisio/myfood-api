import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type FastifyServerOptions,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault
} from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'
import type { DependencyContainer } from 'tsyringe'
import type { Env } from '@/config/env.js'
import { uuidv7 } from '@/shared/uuid.js'
import { registerErrorHandler } from './error-handler.js'
import { registerSwagger } from './plugins/swagger.js'
import { registerHealthRoutes } from './routes/health.js'

export type App = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>

// delivery_code nunca pode ser logado. O Pino não tem wildcard recursivo,
// então os níveis de aninhamento são escritos um a um.
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'deliveryCode',
  'delivery_code',
  '*.deliveryCode',
  '*.delivery_code',
  '*.*.deliveryCode',
  '*.*.delivery_code'
]

function buildLoggerOptions(env: Env): NonNullable<FastifyServerOptions['logger']> {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
    ...(env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
          }
        }
      : {})
  }
}

export async function buildApp(env: Env, container: DependencyContainer): Promise<App> {
  const app = Fastify({
    logger: buildLoggerOptions(env),
    genReqId: () => uuidv7()
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, { origin: true, credentials: true })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

  await registerSwagger(app)
  registerErrorHandler(app)

  registerHealthRoutes(app, container)

  return app
}
