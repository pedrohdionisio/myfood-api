import 'reflect-metadata'
import type { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda'
import { pino } from 'pino'
import type { IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import type { ProcessOrderEventUseCase } from '@/application/useCases/analytics/ProcessOrderEventUseCase.js'
import { env } from '@/config/env.js'
import { buildLoggerOptions } from '@/config/logger.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'

const logger = pino(buildLoggerOptions(env)).child({ lambda: 'order-events' })

const processOrderEvent = buildContainer(env).resolve<ProcessOrderEventUseCase>(
  TOKENS.ProcessOrderEventUseCase
)

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchItemFailure[] = []

  for (const record of event.Records) {
    try {
      const orderEvent = JSON.parse(record.body) as IOutboxEvent
      const applied = await processOrderEvent.execute(orderEvent)

      logger.info(
        { eventId: orderEvent.id, type: orderEvent.type, applied },
        applied ? 'aggregate updated' : 'already processed, ignored'
      )
    } catch (error) {
      logger.error({ err: error, messageId: record.messageId }, 'message failed')
      batchItemFailures.push({ itemIdentifier: record.messageId })
    }
  }

  return { batchItemFailures }
}
