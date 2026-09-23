import 'reflect-metadata'
import type { IOutboxRepository } from '@/application/interfaces/IOutboxRepository.js'
import { awsCredentials } from '@/config/aws.js'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { SqsEventPublisher } from '@/infra/queues/SqsEventPublisher.js'
import { createWorkerLogger, shutdownSignal, sleep } from './runtime.js'

const BATCH_SIZE = 20
const IDLE_DELAY_MS = 2000

const logger = createWorkerLogger(env, 'outbox-publisher')

const container = buildContainer(env)
const outbox = container.resolve<IOutboxRepository>(TOKENS.OutboxRepository)

const publisher = new SqsEventPublisher(
  env.SQS_ORDER_EVENTS_URL,
  env.AWS_REGION,
  awsCredentials(env)
)

const signal = shutdownSignal(logger)

logger.info({ queue: env.SQS_ORDER_EVENTS_URL }, 'draining outbox')

while (!signal.aborted) {
  const pending = await outbox.listPending(BATCH_SIZE)

  if (pending.length === 0) {
    await sleep(IDLE_DELAY_MS, signal)
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
