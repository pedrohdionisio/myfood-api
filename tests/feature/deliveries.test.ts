import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { deliveryConfirmationAttempts } from '@/db/schema/index.js'
import { MAX_FAILED_CONFIRMATIONS } from '@/domain/delivery.js'
import { setupTestApp } from '../support/app.js'
import { createStaff } from '../support/factories.js'
import {
  advanceOrderTo,
  confirmDelivery,
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

async function orderOutForDelivery() {
  const order = await placeOrder(t, s)
  await advanceOrderTo(t, s, order.id, 'OUT_FOR_DELIVERY')
  return order
}

const wrongCodeFor = (code: string) => (code === '0000' ? '1111' : '0000')

async function attempts(orderId: string) {
  const rows = await t.db
    .select({ success: deliveryConfirmationAttempts.success })
    .from(deliveryConfirmationAttempts)
    .where(eq(deliveryConfirmationAttempts.orderId, orderId))
  return rows.map(({ success }) => success)
}

describe('deliveries', () => {
  it("should list the driver's assigned deliveries", async () => {
    const order = await orderOutForDelivery()
    await placeOrder(t, s)

    const response = await t.request('GET', '/me/deliveries', { token: s.driver.token })

    expect(response.statusCode).toBe(200)
    expect(response.json().map(({ id }: { id: string }) => id)).toEqual([order.id])
  })

  it('should confirm the delivery with the right code (rule 4)', async () => {
    const order = await orderOutForDelivery()

    const response = await confirmDelivery(t, s, order.id, order.deliveryCode)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ orderId: order.id, status: 'DELIVERED' })
    expect(await attempts(order.id)).toEqual([true])
    expect((await statusHistory(t, order.id)).at(-1)).toEqual({
      fromStatus: 'OUT_FOR_DELIVERY',
      toStatus: 'DELIVERED',
      actorType: 'RESTAURANT_USER'
    })
    expect(await outboxTypes(t, order.id)).toEqual(['ORDER_CREATED', 'ORDER_DELIVERED'])
  })

  it('should record a wrong code without delivering', async () => {
    const order = await orderOutForDelivery()

    const response = await confirmDelivery(t, s, order.id, wrongCodeFor(order.deliveryCode))

    expect(response.statusCode).toBe(422)
    expect(await attempts(order.id)).toEqual([false])
    const current = await t.request('GET', `/orders/${order.id}`, { token: s.customer.token })
    expect(current.json().status).toBe('OUT_FOR_DELIVERY')
  })

  it('should block confirmation after too many wrong codes, even with the right one', async () => {
    const order = await orderOutForDelivery()
    const wrong = wrongCodeFor(order.deliveryCode)

    for (let attempt = 0; attempt < MAX_FAILED_CONFIRMATIONS; attempt++) {
      expect((await confirmDelivery(t, s, order.id, wrong)).statusCode).toBe(422)
    }

    const blocked = await confirmDelivery(t, s, order.id, order.deliveryCode)

    expect(blocked.statusCode).toBe(429)
    expect(await attempts(order.id)).toHaveLength(MAX_FAILED_CONFIRMATIONS)
  })

  it('should refuse a driver who is not assigned to the order', async () => {
    const order = await orderOutForDelivery()
    const otherDriver = await createStaff(t.db, s.restaurant.id, 'DRIVER')

    const response = await t.request('POST', `/orders/${order.id}/confirm-delivery`, {
      token: otherDriver.token,
      body: { code: order.deliveryCode }
    })

    expect(response.statusCode).toBe(403)
    expect(await attempts(order.id)).toEqual([])
  })

  it('should refuse a malformed code before touching the order', async () => {
    const order = await orderOutForDelivery()

    const response = await confirmDelivery(t, s, order.id, '12')

    expect(response.statusCode).toBe(422)
    expect(await attempts(order.id)).toEqual([])
  })

  it('should let the driver report a failed delivery', async () => {
    const order = await orderOutForDelivery()

    const response = await t.request('POST', `/orders/${order.id}/delivery-failed`, {
      token: s.driver.token,
      body: { reason: 'Cliente ausente' }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ orderId: order.id, status: 'DELIVERY_FAILED' })
  })

  it('should let the owner report a failed delivery and tell the driver', async () => {
    const order = await orderOutForDelivery()
    await t.request('POST', '/restaurant-users/me/push-tokens', {
      token: s.driver.token,
      body: { token: 'ExponentPushToken[driver]', platform: 'IOS' }
    })

    const response = await ownerAction(t, s, order.id, 'delivery-failed', {
      reason: 'Moto quebrou'
    })

    expect(response.json().status).toBe('DELIVERY_FAILED')
    expect(t.fakes.pushGateway.sent).toEqual([
      expect.objectContaining({ token: 'ExponentPushToken[driver]', title: 'Entrega encerrada' })
    ])
  })
})
