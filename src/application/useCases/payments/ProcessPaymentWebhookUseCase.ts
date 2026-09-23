import { inject, injectable } from 'tsyringe'
import type { IPaymentsRepository } from '@/application/interfaces/IPaymentsRepository.js'
import type { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import { TOKENS } from '@/di/tokens.js'

export interface IPaymentWebhookEvent {
  id?: string | undefined
  event: string
  data: {
    transparent: {
      id: string
      amount: number
      paidAmount?: number | undefined
      receiptUrl?: string | null | undefined
    }
  }
}

export type PaymentWebhookOutcome = 'APPLIED' | 'DUPLICATE' | 'IGNORED'

@injectable()
export class ProcessPaymentWebhookUseCase {
  constructor(
    @inject(TOKENS.PaymentsRepository)
    private readonly payments: IPaymentsRepository,
    @inject(TOKENS.NotifyOrderChangeUseCase)
    private readonly notify: NotifyOrderChangeUseCase
  ) {}

  async execute(payload: IPaymentWebhookEvent): Promise<PaymentWebhookOutcome> {
    const charge = payload.data.transparent
    // A documentação mostra o envelope v2 com `id`, mas o exemplo do evento de checkout
    // transparente vem sem ele. Sem id próprio, evento e cobrança juntos identificam a entrega —
    // e as retentativas repetem os dois.
    const eventId = payload.id ?? `${payload.event}:${charge.id}`

    if (payload.event === 'transparent.completed') {
      const confirmed = await this.payments.confirm({
        eventId,
        event: payload.event,
        payload,
        providerChargeId: charge.id,
        paidAmountCents: charge.paidAmount ?? charge.amount,
        receiptUrl: charge.receiptUrl ?? null
      })

      if (!confirmed) {
        return 'DUPLICATE'
      }

      // É aqui que o pedido online nasce para o restaurante, então é aqui que o stream avisa.
      await this.notify.execute({
        change: 'PAYMENT_CONFIRMED',
        actor: 'SYSTEM',
        order: confirmed
      })

      return 'APPLIED'
    }

    if (payload.event === 'transparent.refunded') {
      const applied = await this.payments.recordRefund({
        eventId,
        event: payload.event,
        payload,
        providerChargeId: charge.id
      })

      return applied ? 'APPLIED' : 'DUPLICATE'
    }

    return 'IGNORED'
  }
}
