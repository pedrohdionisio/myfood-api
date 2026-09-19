import { z } from 'zod'
import type { IPayment } from '@/application/interfaces/IPaymentsRepository.js'
import { PAYMENT_CHARGE_STATUSES } from '@/domain/enums.js'

// O pedido carrega o delivery_code; a cobrança não. São schemas separados de propósito (regra 1).
export const paymentResponseSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  status: z.enum(PAYMENT_CHARGE_STATUSES),
  amountCents: z.int(),
  brCode: z.string(),
  receiptUrl: z.string().nullable(),
  expiresAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  refundedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime()
})

export function toPaymentResponse(payment: IPayment): z.infer<typeof paymentResponseSchema> {
  const { providerChargeId: _providerChargeId, ...response } = payment

  return response
}

export const webhookQuerySchema = z.object({
  webhookSecret: z.string().optional()
})

/**
 * Só o que a API usa. O resto do payload é guardado cru em payment_webhook_events — um gateway
 * mudar um campo que não lemos não pode derrubar a entrega e disparar retentativa.
 */
export const paymentWebhookBodySchema = z.object({
  id: z.string().max(128).optional(),
  event: z.string().max(60),
  data: z.object({
    transparent: z.object({
      id: z.string().max(64),
      amount: z.int(),
      paidAmount: z.int().optional(),
      receiptUrl: z.string().nullish()
    })
  })
})

export const webhookAckSchema = z.object({
  received: z.literal(true)
})
