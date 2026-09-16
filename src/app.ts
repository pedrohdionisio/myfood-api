import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyServerOptions } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'
import { env } from '@/config/env.js'
import { sql } from '@/db/client.js'
import { healthRoutes } from '@/modules/health/health.routes.js'
import { registerErrorHandler } from '@/plugins/error-handler.js'
import { registerSwagger } from '@/plugins/swagger.js'
import { uuidv7 } from '@/shared/uuid.js'

// delivery_code nunca pode ser logado (regra 1). O Pino não tem wildcard recursivo,
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

function buildLoggerOptions(): NonNullable<FastifyServerOptions['logger']> {
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

export async function buildApp() {
  const app = Fastify({
    logger: buildLoggerOptions(),
    genReqId: () => uuidv7()
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  await app.register(helmet, { contentSecurityPolicy: false })

  await app.register(cors, {
    origin: true,
    credentials: true
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  })

  await registerSwagger(app)
  registerErrorHandler(app)

  await app.register(healthRoutes)

  app.addHook('onClose', async () => {
    await sql.end()
  })

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
