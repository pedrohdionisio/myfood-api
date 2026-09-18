import 'reflect-metadata'
import { pino } from 'pino'
import type { IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import type { ProcessOrderEventUseCase } from '@/application/useCases/analytics/ProcessOrderEventUseCase.js'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { SqsQueueConsumer } from '@/infra/queues/SqsQueueConsumer.js'

const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
        }
      }
    : {})
}).child({ worker: 'order-events' })

const container = buildContainer(env)
const processOrderEvent = container.resolve<ProcessOrderEventUseCase>(
  TOKENS.ProcessOrderEventUseCase
)

const consumer = new SqsQueueConsumer(
  env.SQS_ORDER_EVENTS_URL,
  env.AWS_REGION,
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
    : undefined
)

const controller = new AbortController()

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    logger.info({ signal }, 'shutting down')
    controller.abort()
  })
}

logger.info({ queue: env.SQS_ORDER_EVENTS_URL }, 'waiting for order events')

try {
  await consumer.consume({
    signal: controller.signal,
    onError: (error, messageId) => logger.error({ err: error, messageId }, 'message failed'),
    handler: async (body) => {
      const event = JSON.parse(body) as IOutboxEvent
      const applied = await processOrderEvent.execute(event)

      logger.info(
        { eventId: event.id, type: event.type, applied },
        applied ? 'aggregate updated' : 'already processed, ignored'
      )
    }
  })
} catch (error) {
  if (!controller.signal.aborted) {
    logger.error({ err: error }, 'consumer stopped')
    process.exitCode = 1
  }
}

consumer.destroy()
await container.resolve<IDatabaseConnection>(TOKENS.Database).close()
