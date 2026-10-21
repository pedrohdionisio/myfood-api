import 'reflect-metadata'
import { pino } from 'pino'
import type {
  IRelayResult,
  RelayOutboxUseCase
} from '@/application/useCases/analytics/RelayOutboxUseCase.js'
import { env } from '@/config/env.js'
import { buildLoggerOptions } from '@/config/logger.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'

const logger = pino(buildLoggerOptions(env)).child({ lambda: 'relay-outbox' })

const relay = buildContainer(env).resolve<RelayOutboxUseCase>(TOKENS.RelayOutboxUseCase)

// Dois gatilhos, nenhum com payload: a API logo depois do commit e a varredura de hora em hora.
export async function handler(): Promise<IRelayResult> {
  const result = await relay.execute({
    onPublished: (event) => logger.info({ eventId: event.id, type: event.type }, 'published'),
    onError: (error, event) =>
      logger.error({ err: error, eventId: event.id }, 'publish failed, will retry')
  })

  if (result.published + result.failed > 0) {
    logger.info(result, 'relay')
  }

  return result
}
