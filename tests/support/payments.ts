import { eq } from 'drizzle-orm'
import { expect } from 'vitest'
import type { IPaymentsRepository } from '@/application/interfaces/IPaymentsRepository.js'
import type { SettlePendingChargesUseCase } from '@/application/useCases/payments/SettlePendingChargesUseCase.js'
import { payments } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { signWebhookPayload } from '@/infra/gateways/abacatepay-webhook.js'
import type { ITestContext } from './app.js'
import { WEBHOOK_SECRET } from './env.js'
import { type OrderingScenario, placeOrder } from './scenarios.js'

export async function placePaidPixOrder(t: ITestContext, s: OrderingScenario) {
  const { order, charge } = await placePixOrder(t, s)
  const response = await sendWebhook(t, paidEvent(charge))
  expect(response.statusCode, response.body).toBe(200)
  return { order, charge }
}

export async function placePixOrder(t: ITestContext, s: OrderingScenario) {
  const order = await placeOrder(t, s, { paymentMethod: 'ONLINE' })
  const response = await t.request('POST', `/orders/${order.id}/payment`, {
    token: s.customer.token
  })
  expect(response.statusCode, response.body).toBe(201)

  const [row] = await t.db.select().from(payments).where(eq(payments.orderId, order.id))
  if (!row) throw new Error('cobrança não gravada')

  return { order, charge: row }
}

export function paidEvent(
  charge: { providerChargeId: string; amountCents: number },
  overrides: { id?: string; paidAmount?: number } = {}
) {
  return {
    id: overrides.id ?? `evt_${charge.providerChargeId}`,
    event: 'transparent.completed',
    data: {
      transparent: {
        id: charge.providerChargeId,
        amount: charge.amountCents,
        paidAmount: overrides.paidAmount ?? charge.amountCents,
        receiptUrl: 'https://abacatepay.test/receipt'
      }
    }
  }
}

export interface IWebhookOptions {
  secret?: string | null
  signature?: string | null
}

export function sendWebhook(t: ITestContext, payload: unknown, options: IWebhookOptions = {}) {
  const raw = JSON.stringify(payload)
  const secret = options.secret === undefined ? WEBHOOK_SECRET : options.secret
  const signature = options.signature === undefined ? signWebhookPayload(raw) : options.signature

  return t.app.inject({
    method: 'POST',
    url: '/webhooks/abacatepay',
    ...(secret === null ? {} : { query: { webhookSecret: secret } }),
    headers: {
      'content-type': 'application/json',
      ...(signature === null ? {} : { 'x-webhook-signature': signature })
    },
    payload: raw
  })
}

export async function settlePendingCharges(t: ITestContext) {
  const errors: unknown[] = []
  const result = await t.container
    .resolve<SettlePendingChargesUseCase>(TOKENS.SettlePendingChargesUseCase)
    .execute({
      onConfirmed: () => {},
      onExpired: () => {},
      onRefunded: () => {},
      onError: (error) => errors.push(error)
    })

  expect(errors).toEqual([])
  return result
}

export function paymentsRepository(t: ITestContext) {
  return t.container.resolve<IPaymentsRepository>(TOKENS.PaymentsRepository)
}
