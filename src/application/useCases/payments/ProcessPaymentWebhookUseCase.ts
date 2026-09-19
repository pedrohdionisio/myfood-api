import { inject, injectable } from 'tsyringe'
import type { IPaymentsRepository } from '@/application/interfaces/IPaymentsRepository.js'
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
    private readonly payments: IPaymentsRepository
  ) {}

  async execute(payload: IPaymentWebhookEvent): Promise<PaymentWebhookOutcome> {
    const charge = payload.data.transparent
    // A documentação mostra o envelope v2 com `id`, mas o exemplo do evento de checkout
    // transparente vem sem ele. Sem id próprio, evento e cobrança juntos identificam a entrega —
    // e as retentativas repetem os dois.
    const eventId = payload.id ?? `${payload.event}:${charge.id}`

    if (payload.event === 'transparent.completed') {
      const applied = await this.payments.confirm({
        eventId,
        event: payload.event,
        payload,
        providerChargeId: charge.id,
        paidAmountCents: charge.paidAmount ?? charge.amount,
        receiptUrl: charge.receiptUrl ?? null
      })

      return applied ? 'APPLIED' : 'DUPLICATE'
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
