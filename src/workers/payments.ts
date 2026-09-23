import 'reflect-metadata'
import type { SettlePendingChargesUseCase } from '@/application/useCases/payments/SettlePendingChargesUseCase.js'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { createWorkerLogger, shutdownSignal, sleep } from './runtime.js'

const SWEEP_INTERVAL_MS = 60_000

const logger = createWorkerLogger(env, 'payments')

const container = buildContainer(env)
const settle = container.resolve<SettlePendingChargesUseCase>(TOKENS.SettlePendingChargesUseCase)

const signal = shutdownSignal(logger)

logger.info('sweeping expired charges and pending refunds')

while (!signal.aborted) {
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

  await sleep(SWEEP_INTERVAL_MS, signal)
}

await container.resolve<IDatabaseConnection>(TOKENS.Database).close()
