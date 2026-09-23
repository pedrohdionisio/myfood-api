import 'reflect-metadata'
import type { IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import type { ProcessOrderEventUseCase } from '@/application/useCases/analytics/ProcessOrderEventUseCase.js'
import { awsCredentials } from '@/config/aws.js'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { SqsQueueConsumer } from '@/infra/queues/SqsQueueConsumer.js'
import { createWorkerLogger, shutdownSignal } from './runtime.js'

const logger = createWorkerLogger(env, 'order-events')

const container = buildContainer(env)
const processOrderEvent = container.resolve<ProcessOrderEventUseCase>(
  TOKENS.ProcessOrderEventUseCase
)

const consumer = new SqsQueueConsumer(env.SQS_ORDER_EVENTS_URL, env.AWS_REGION, awsCredentials(env))

const signal = shutdownSignal(logger)

logger.info({ queue: env.SQS_ORDER_EVENTS_URL }, 'waiting for order events')

try {
  await consumer.consume({
    signal,
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
  if (!signal.aborted) {
    logger.error({ err: error }, 'consumer stopped')
    process.exitCode = 1
  }
}

consumer.destroy()
await container.resolve<IDatabaseConnection>(TOKENS.Database).close()
