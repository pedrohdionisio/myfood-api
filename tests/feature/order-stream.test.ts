import { describe, expect, it } from 'vitest'
import { orderStreamEventSchema } from '@/schemas/orders.js'
import { setupTestApp } from '../support/app.js'
import { expectNoDeliveryCode } from '../support/assertions.js'
import { advanceOrderTo, createOrderingScenario, placeOrder } from '../support/scenarios.js'

const t = setupTestApp()

describe('order stream', () => {
  it('should publish narrow events for new orders and status changes, never the delivery code', async () => {
    const s = await createOrderingScenario(t)

    const order = await placeOrder(t, s)
    await advanceOrderTo(t, s, order.id, 'CONFIRMED')
    const events = t.fakes.orderStream.eventsFor(s.restaurant.id)

    expect(events.map(({ type }) => type)).toEqual(['ORDER_PLACED', 'ORDER_STATUS_CHANGED'])
    for (const event of events) {
      expect(orderStreamEventSchema.strict().parse(event)).toMatchObject({ orderId: order.id })
      expectNoDeliveryCode(event, order.deliveryCode)
    }
  })

  it('should not announce an order waiting for payment', async () => {
    const s = await createOrderingScenario(t)

    await placeOrder(t, s, { paymentMethod: 'ONLINE' })
    const cash = await placeOrder(t, s)

    expect(t.fakes.orderStream.eventsFor(s.restaurant.id)).toEqual([
      expect.objectContaining({ orderId: cash.id })
    ])
  })

  it("should only publish to the order's own restaurant", async () => {
    const s = await createOrderingScenario(t)
    const other = await createOrderingScenario(t)

    await placeOrder(t, other)

    expect(t.fakes.orderStream.eventsFor(s.restaurant.id)).toEqual([])
  })
})

describe('order stream ticket', () => {
  it('should issue a single-use ticket for the owner, bound to the restaurant', async () => {
    const s = await createOrderingScenario(t)

    const response = await t.request(
      'POST',
      `/restaurants/${s.restaurant.id}/orders/stream-ticket`,
      {
        token: s.owner.token
      }
    )

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ url: 'wss://realtime.test/dev' })
    expect(t.fakes.orderStreamTickets.issued.get(response.json().ticket)).toBe(s.restaurant.id)
  })

  it('should refuse a driver and the owner of another restaurant', async () => {
    const s = await createOrderingScenario(t)
    const other = await createOrderingScenario(t)

    const driver = await t.request('POST', `/restaurants/${s.restaurant.id}/orders/stream-ticket`, {
      token: s.driver.token
    })
    const stranger = await t.request(
      'POST',
      `/restaurants/${s.restaurant.id}/orders/stream-ticket`,
      { token: other.owner.token }
    )

    expect(driver.statusCode).toBe(403)
    expect(stranger.statusCode).toBe(403)
    expect(t.fakes.orderStreamTickets.issued.size).toBe(0)
  })
})
