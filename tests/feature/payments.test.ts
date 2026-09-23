import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { orders, payments, paymentWebhookEvents } from '@/db/schema/index.js'
import { signWebhookPayload } from '@/infra/gateways/abacatepay-webhook.js'
import { setupTestApp } from '../support/app.js'
import { createCustomer } from '../support/factories.js'
import {
  paidEvent,
  paymentsRepository,
  placePaidPixOrder,
  placePixOrder,
  sendWebhook,
  settlePendingCharges
} from '../support/payments.js'
import {
  createOrderingScenario,
  type OrderingScenario,
  outboxTypes,
  ownerAction,
  placeOrder,
  statusHistory
} from '../support/scenarios.js'

const t = setupTestApp()

let s: OrderingScenario

beforeEach(async () => {
  s = await createOrderingScenario(t)
})

async function orderStatus(orderId: string) {
  const [row] = await t.db
    .select({ status: orders.status, paymentStatus: orders.paymentStatus })
    .from(orders)
    .where(eq(orders.id, orderId))
  return row
}

async function chargeStatus(orderId: string) {
  const [row] = await t.db
    .select({ status: payments.status })
    .from(payments)
    .where(eq(payments.orderId, orderId))
  return row?.status
}

describe('Pix payment', () => {
  it('should create a charge for the order total, without the provider id', async () => {
    const order = await placeOrder(t, s, { paymentMethod: 'ONLINE' })

    const response = await t.request('POST', `/orders/${order.id}/payment`, {
      token: s.customer.token
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      orderId: order.id,
      status: 'PENDING',
      amountCents: 6100
    })
    expect(response.json()).not.toHaveProperty('providerChargeId')
    expect([...t.fakes.paymentGateway.charges.values()]).toEqual([
      expect.objectContaining({ orderId: order.id, amountCents: 6100 })
    ])
  })

  it('should return the open charge instead of creating another', async () => {
    const order = await placeOrder(t, s, { paymentMethod: 'ONLINE' })
    const first = await t.request('POST', `/orders/${order.id}/payment`, {
      token: s.customer.token
    })

    const second = await t.request('POST', `/orders/${order.id}/payment`, {
      token: s.customer.token
    })
    const current = await t.request('GET', `/orders/${order.id}/payment`, {
      token: s.customer.token
    })

    expect(second.json().id).toBe(first.json().id)
    expect(current.json().id).toBe(first.json().id)
    expect(t.fakes.paymentGateway.charges.size).toBe(1)
  })

  it('should refuse a charge for an offline order or for another customer', async () => {
    const cash = await placeOrder(t, s)
    const online = await placeOrder(t, s, { paymentMethod: 'ONLINE' })
    const other = await createCustomer(t.db)

    const offline = await t.request('POST', `/orders/${cash.id}/payment`, {
      token: s.customer.token
    })
    const foreign = await t.request('POST', `/orders/${online.id}/payment`, { token: other.token })

    expect(offline.statusCode).toBe(422)
    expect(foreign.statusCode).toBe(404)
  })
})

describe('payment webhook (rule 8)', () => {
  it('should confirm the payment and only then announce the order (rule 9)', async () => {
    const { order, charge } = await placePixOrder(t, s)
    expect(await outboxTypes(t, order.id)).toEqual([])

    const response = await sendWebhook(t, paidEvent(charge))

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ received: true })
    expect(await orderStatus(order.id)).toEqual({ status: 'PENDING', paymentStatus: 'PAID' })
    expect(await chargeStatus(order.id)).toBe('PAID')
    expect(await outboxTypes(t, order.id)).toEqual(['ORDER_CREATED'])
    expect((await statusHistory(t, order.id)).at(-1)).toEqual({
      fromStatus: 'PENDING_PAYMENT',
      toStatus: 'PENDING',
      actorType: 'SYSTEM'
    })
  })

  it('should apply a redelivered event only once', async () => {
    const { order, charge } = await placePixOrder(t, s)

    await sendWebhook(t, paidEvent(charge))
    const replay = await sendWebhook(t, paidEvent(charge))

    expect(replay.statusCode).toBe(200)
    expect(await outboxTypes(t, order.id)).toEqual(['ORDER_CREATED'])
    expect(await t.db.select().from(paymentWebhookEvents)).toHaveLength(1)
  })

  it('should not confirm a payment of a different amount', async () => {
    const { order, charge } = await placePixOrder(t, s)

    await sendWebhook(t, paidEvent(charge, { paidAmount: charge.amountCents - 1 }))

    expect(await orderStatus(order.id)).toEqual({
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING'
    })
  })

  it.each([
    ['a missing secret', { secret: null }],
    ['a wrong secret', { secret: 'wrong-secret-0123456789' }],
    ['a missing signature', { signature: null }],
    ['a signature of another body', { signature: signWebhookPayload('{}') }]
  ])('should answer 401 to %s and change nothing', async (_, options) => {
    const { order, charge } = await placePixOrder(t, s)

    const response = await sendWebhook(t, paidEvent(charge), options)

    expect(response.statusCode).toBe(401)
    expect(await orderStatus(order.id)).toEqual({
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING'
    })
    expect(await t.db.select().from(paymentWebhookEvents)).toEqual([])
  })

  it('should answer 500 on a processing failure so the gateway retries, then apply the retry', async () => {
    const { order, charge } = await placePixOrder(t, s)
    vi.spyOn(paymentsRepository(t), 'confirm').mockRejectedValueOnce(new Error('database down'))

    const failed = await sendWebhook(t, paidEvent(charge))
    const retried = await sendWebhook(t, paidEvent(charge))

    expect(failed.statusCode).toBe(500)
    expect(retried.statusCode).toBe(200)
    expect(await orderStatus(order.id)).toMatchObject({ status: 'PENDING' })
  })

  it('should acknowledge events it does not handle', async () => {
    const response = await sendWebhook(t, {
      event: 'transparent.disputed',
      data: { transparent: { id: 'pix_char_x', amount: 100 } }
    })

    expect(response.statusCode).toBe(200)
  })
})

describe('settlement', () => {
  async function expire(orderId: string) {
    await t.db
      .update(payments)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(payments.orderId, orderId))
  }

  it('should confirm an expired charge the gateway reports as paid (lost webhook)', async () => {
    const { order, charge } = await placePixOrder(t, s)
    t.fakes.paymentGateway.setStatus(charge.providerChargeId, 'PAID')
    await expire(order.id)

    const result = await settlePendingCharges(t)

    expect(result).toMatchObject({ confirmed: 1, expired: 0 })
    expect(await orderStatus(order.id)).toEqual({ status: 'PENDING', paymentStatus: 'PAID' })
    expect(await outboxTypes(t, order.id)).toEqual(['ORDER_CREATED'])
  })

  it('should cancel the order of an unpaid expired charge', async () => {
    const { order } = await placePixOrder(t, s)
    await expire(order.id)

    const result = await settlePendingCharges(t)

    expect(result).toMatchObject({ confirmed: 0, expired: 1 })
    expect(await orderStatus(order.id)).toEqual({ status: 'CANCELED', paymentStatus: 'FAILED' })
    expect(await outboxTypes(t, order.id)).toEqual([])
  })

  it('should refund a Pix paid after the charge expired, without reopening the order', async () => {
    const { order, charge } = await placePixOrder(t, s)
    await expire(order.id)
    await settlePendingCharges(t)

    const late = await sendWebhook(t, paidEvent(charge))

    expect(late.statusCode).toBe(200)
    expect(await chargeStatus(order.id)).toBe('REFUND_PENDING')
    expect(await orderStatus(order.id)).toMatchObject({ status: 'CANCELED' })

    await settlePendingCharges(t)

    expect(t.fakes.paymentGateway.refunds).toEqual([charge.providerChargeId])
    expect(await chargeStatus(order.id)).toBe('REFUNDED')
    expect(await orderStatus(order.id)).toEqual({ status: 'CANCELED', paymentStatus: 'REFUNDED' })
  })

  it('should refund a paid order the restaurant rejects', async () => {
    const { order, charge } = await placePaidPixOrder(t, s)

    await ownerAction(t, s, order.id, 'reject', { reason: 'Fechando' })
    expect(await chargeStatus(order.id)).toBe('REFUND_PENDING')

    const result = await settlePendingCharges(t)

    expect(result.refunded).toBe(1)
    expect(t.fakes.paymentGateway.refunds).toEqual([charge.providerChargeId])
    expect(await chargeStatus(order.id)).toBe('REFUNDED')
  })
})
