import 'reflect-metadata'
import { pino } from 'pino'
import type { IOutboxRepository } from '@/application/interfaces/IOutboxRepository.js'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { SqsEventPublisher } from '@/infra/queues/SqsEventPublisher.js'

const BATCH_SIZE = 20
const IDLE_DELAY_MS = 2000

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
}).child({ worker: 'outbox-publisher' })

const container = buildContainer(env)
const outbox = container.resolve<IOutboxRepository>(TOKENS.OutboxRepository)

const publisher = new SqsEventPublisher(
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)

    controller.signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

logger.info({ queue: env.SQS_ORDER_EVENTS_URL }, 'draining outbox')

while (!controller.signal.aborted) {
  const pending = await outbox.listPending(BATCH_SIZE)

  if (pending.length === 0) {
    await sleep(IDLE_DELAY_MS)
    continue
  }

  for (const event of pending) {
    try {
      await publisher.publish(event)
      await outbox.markPublished(event.id)

      logger.info({ eventId: event.id, type: event.type }, 'published')
    } catch (error) {
      // A linha continua pendente de propósito: publicar duas vezes é inofensivo, porque o
      // consumidor deduplica pelo id do evento. Perder o evento não seria.
      await outbox.markFailed(event.id)
      logger.error({ err: error, eventId: event.id }, 'publish failed, will retry')
    }
  }
}

publisher.destroy()
await container.resolve<IDatabaseConnection>(TOKENS.Database).close()
