import type { AddressInfo } from 'node:net'
import { beforeAll, describe, expect, it } from 'vitest'
import { orderStreamEventSchema } from '@/schemas/orders.js'
import { setupTestApp } from '../support/app.js'
import { expectNoDeliveryCode } from '../support/assertions.js'
import { advanceOrderTo, createOrderingScenario, placeOrder } from '../support/scenarios.js'

const t = setupTestApp()

let baseUrl: string

beforeAll(async () => {
  await t.app.listen({ host: '127.0.0.1', port: 0 })
  baseUrl = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`
})

async function openStream(restaurantId: string, token: string) {
  const controller = new AbortController()
  const response = await fetch(`${baseUrl}/restaurants/${restaurantId}/orders/stream`, {
    headers: { authorization: `Bearer ${token}` },
    signal: controller.signal
  })
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  return {
    response,
    close: () => controller.abort(),
    async nextEvents(count: number): Promise<{ event: string; data: unknown }[]> {
      const events: { event: string; data: unknown }[] = []

      while (events.length < count && reader) {
        let boundary = buffer.indexOf('\n\n')

        while (boundary >= 0) {
          const block = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          const event = /^event: (.+)$/m.exec(block)?.[1]
          const data = /^data: (.+)$/m.exec(block)?.[1]

          if (event && data) {
            events.push({ event, data: JSON.parse(data) })
          }

          boundary = buffer.indexOf('\n\n')
        }

        if (events.length >= count) break

        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
      }

      return events
    }
  }
}

describe('order stream (SSE)', () => {
  it('should push narrow events for new orders and status changes, never the delivery code', async () => {
    const s = await createOrderingScenario(t)
    const stream = await openStream(s.restaurant.id, s.owner.token)

    try {
      expect(stream.response.status).toBe(200)
      expect(stream.response.headers.get('content-type')).toBe('text/event-stream')

      const order = await placeOrder(t, s)
      await advanceOrderTo(t, s, order.id, 'CONFIRMED')
      const events = await stream.nextEvents(2)

      expect(events.map(({ event }) => event)).toEqual(['ORDER_PLACED', 'ORDER_STATUS_CHANGED'])
      for (const { data } of events) {
        expect(orderStreamEventSchema.strict().parse(data)).toMatchObject({ orderId: order.id })
        expectNoDeliveryCode(data, order.deliveryCode)
      }
    } finally {
      stream.close()
    }
  })

  it('should not announce an order waiting for payment', async () => {
    const s = await createOrderingScenario(t)
    const stream = await openStream(s.restaurant.id, s.owner.token)

    try {
      await placeOrder(t, s, { paymentMethod: 'ONLINE' })
      const cash = await placeOrder(t, s)
      const [first] = await stream.nextEvents(1)

      expect(first?.data).toMatchObject({ orderId: cash.id })
    } finally {
      stream.close()
    }
  })

  it("should only stream the restaurant's own orders", async () => {
    const s = await createOrderingScenario(t)
    const other = await createOrderingScenario(t)
    const stream = await openStream(s.restaurant.id, s.owner.token)

    try {
      await placeOrder(t, other)
      const own = await placeOrder(t, s)
      const [first] = await stream.nextEvents(1)

      expect(first?.data).toMatchObject({ orderId: own.id })
    } finally {
      stream.close()
    }
  })

  it('should refuse a driver', async () => {
    const s = await createOrderingScenario(t)

    const response = await fetch(`${baseUrl}/restaurants/${s.restaurant.id}/orders/stream`, {
      headers: { authorization: `Bearer ${s.driver.token}` }
    })

    expect(response.status).toBe(403)
  })
})
