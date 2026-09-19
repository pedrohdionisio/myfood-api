import 'reflect-metadata'
import { pino } from 'pino'
import type { SettlePendingChargesUseCase } from '@/application/useCases/payments/SettlePendingChargesUseCase.js'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'

const SWEEP_INTERVAL_MS = 60_000

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
}).child({ worker: 'payments' })

const container = buildContainer(env)
const settle = container.resolve<SettlePendingChargesUseCase>(TOKENS.SettlePendingChargesUseCase)

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

logger.info('sweeping expired charges and pending refunds')

while (!controller.signal.aborted) {
  try {
    const result = await settle.execute({
      onConfirmed: (charge) =>
        logger.warn(
          { orderId: charge.orderId, chargeId: charge.providerChargeId },
          'pago no gateway e não confirmado pelo webhook: conciliado aqui'
        ),
      onExpired: (charge) =>
        logger.info({ orderId: charge.orderId }, 'cobrança expirada, pedido cancelado'),
      onRefunded: (charge) => logger.info({ orderId: charge.orderId }, 'estorno concluído'),
      onError: (error, charge) =>
        // A linha continua na fila: estorno é idempotente no gateway, então repetir é seguro.
        logger.error(
          { err: error, chargeId: charge.providerChargeId },
          'falha ao acertar cobrança, tentará de novo'
        )
    })

    if (result.expired + result.confirmed + result.refunded > 0) {
      logger.info(result, 'sweep')
    }
  } catch (error) {
    logger.error({ err: error }, 'sweep falhou')
  }

  await sleep(SWEEP_INTERVAL_MS)
}

await container.resolve<IDatabaseConnection>(TOKENS.Database).close()
