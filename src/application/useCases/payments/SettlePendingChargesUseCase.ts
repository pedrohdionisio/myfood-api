import { inject, injectable } from 'tsyringe'
import type { IPaymentGateway } from '@/application/interfaces/IPaymentGateway.js'
import type {
  IPaymentsRepository,
  IPendingCharge
} from '@/application/interfaces/IPaymentsRepository.js'
import type { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import { TOKENS } from '@/di/tokens.js'

const BATCH_SIZE = 20

export interface ISettleResult {
  expired: number
  confirmed: number
  refunded: number
}

export interface ISettleReporter {
  onConfirmed(charge: IPendingCharge): void
  onExpired(charge: IPendingCharge): void
  onRefunded(charge: IPendingCharge): void
  onError(error: unknown, charge: IPendingCharge): void
}

@injectable()
export class SettlePendingChargesUseCase {
  constructor(
    @inject(TOKENS.PaymentsRepository)
    private readonly payments: IPaymentsRepository,
    @inject(TOKENS.PaymentGateway)
    private readonly gateway: IPaymentGateway,
    @inject(TOKENS.NotifyOrderChangeUseCase)
    private readonly notify: NotifyOrderChangeUseCase
  ) {}

  async execute(reporter: ISettleReporter): Promise<ISettleResult> {
    const result: ISettleResult = { expired: 0, confirmed: 0, refunded: 0 }

    for (const charge of await this.payments.listExpired(BATCH_SIZE)) {
      try {
        // Pergunta ao gateway antes de cancelar: se o webhook se perdeu, o dinheiro entrou e o
        // pedido não pode morrer por isso. É esta consulta que torna o webhook não essencial.
        const status = await this.gateway.getChargeStatus(charge.providerChargeId)

        if (status === 'PAID') {
          const confirmed = await this.payments.confirm({
            eventId: `reconciliation:${charge.providerChargeId}`,
            event: 'reconciliation.paid',
            payload: { chargeId: charge.providerChargeId, status },
            providerChargeId: charge.providerChargeId,
            paidAmountCents: charge.amountCents,
            receiptUrl: null
          })

          if (confirmed) {
            result.confirmed += 1
            reporter.onConfirmed(charge)

            await this.notify.execute({
              change: 'PAYMENT_CONFIRMED',
              actor: 'SYSTEM',
              order: confirmed
            })
          }

          continue
        }

        const canceled = await this.payments.expire(charge.id)
        result.expired += 1
        reporter.onExpired(charge)

        if (canceled) {
          await this.notify.execute({
            change: 'STATUS_CHANGED',
            actor: 'SYSTEM',
            order: canceled
          })
        }
      } catch (error) {
        reporter.onError(error, charge)
      }
    }

    for (const charge of await this.payments.listAwaitingRefund(BATCH_SIZE)) {
      try {
        await this.gateway.refundCharge(charge.providerChargeId, 'Pedido cancelado no MyFood.')
        await this.payments.markRefunded(charge.id)
        result.refunded += 1
        reporter.onRefunded(charge)
      } catch (error) {
        reporter.onError(error, charge)
      }
    }

    return result
  }
}
