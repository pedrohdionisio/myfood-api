import 'reflect-metadata'
import { pino } from 'pino'
import type {
  ISettleResult,
  SettlePendingChargesUseCase
} from '@/application/useCases/payments/SettlePendingChargesUseCase.js'
import { env } from '@/config/env.js'
import { buildLoggerOptions } from '@/config/logger.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'

const logger = pino(buildLoggerOptions(env)).child({ lambda: 'settle-charges' })

const settle = buildContainer(env).resolve<SettlePendingChargesUseCase>(
  TOKENS.SettlePendingChargesUseCase
)

// Dois gatilhos: o agendamento de cada cobrança no vencimento e a varredura de hora em hora, que
// também executa os estornos pendentes. Os dois acertam tudo o que estiver vencido, não uma só.
export async function handler(): Promise<ISettleResult> {
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
    logger.info(result, 'settle')
  }

  return result
}
