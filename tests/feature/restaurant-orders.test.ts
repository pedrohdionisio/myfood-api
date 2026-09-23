import { beforeEach, describe, expect, it } from 'vitest'
import { setupTestApp } from '../support/app.js'
import { createRestaurant, createStaff } from '../support/factories.js'
import {
  advanceOrderTo,
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

describe('restaurant orders', () => {
  it('should list the orders with the customer contact, newest first, filtered by status', async () => {
    const first = await placeOrder(t, s)
    const second = await placeOrder(t, s)
    await advanceOrderTo(t, s, first.id, 'CONFIRMED')

    const all = await t.request('GET', `/restaurants/${s.restaurant.id}/orders`, {
      token: s.owner.token
    })
    const pending = await t.request('GET', `/restaurants/${s.restaurant.id}/orders`, {
      token: s.owner.token,
      query: { status: 'PENDING' }
    })

    expect(all.json().items.map(({ id }: { id: string }) => id)).toEqual([second.id, first.id])
    expect(all.json().items[0].customer).toEqual({ name: s.customer.name, phone: s.customer.phone })
    expect(pending.json().items.map(({ id }: { id: string }) => id)).toEqual([second.id])
  })

  it('should walk the order through the kitchen, recording every step (rule 3)', async () => {
    const order = await placeOrder(t, s)

    await advanceOrderTo(t, s, order.id, 'OUT_FOR_DELIVERY')

    expect(await statusHistory(t, order.id)).toEqual([
      { fromStatus: null, toStatus: 'PENDING', actorType: 'CUSTOMER' },
      { fromStatus: 'PENDING', toStatus: 'CONFIRMED', actorType: 'RESTAURANT_USER' },
      { fromStatus: 'CONFIRMED', toStatus: 'PREPARING', actorType: 'RESTAURANT_USER' },
      { fromStatus: 'PREPARING', toStatus: 'READY', actorType: 'RESTAURANT_USER' },
      { fromStatus: 'READY', toStatus: 'OUT_FOR_DELIVERY', actorType: 'RESTAURANT_USER' }
    ])

    const response = await t.request('GET', `/orders/${order.id}`, { token: s.customer.token })
    expect(response.json()).toMatchObject({ status: 'OUT_FOR_DELIVERY' })
    for (const field of ['confirmedAt', 'readyAt', 'dispatchedAt']) {
      expect(response.json()[field]).not.toBeNull()
    }
  })

  it('should refuse a transition the state machine does not allow, leaving no history', async () => {
    const order = await placeOrder(t, s)

    const response = await ownerAction(t, s, order.id, 'ready')

    expect(response.statusCode).toBe(422)
    expect(response.json().details).toEqual({ from: 'PENDING', to: 'READY' })
    expect(await statusHistory(t, order.id)).toHaveLength(1)
  })

  it('should reject with a reason and cancel the aggregates', async () => {
    const order = await placeOrder(t, s)

    const response = await ownerAction(t, s, order.id, 'reject', { reason: 'Sem entregador' })

    expect(response.json()).toMatchObject({
      status: 'REJECTED',
      cancellationReason: 'Sem entregador'
    })
    expect(await outboxTypes(t, order.id)).toEqual(['ORDER_CREATED', 'ORDER_CANCELED'])
  })

  it('should cancel an order already in the kitchen', async () => {
    const order = await placeOrder(t, s)
    await advanceOrderTo(t, s, order.id, 'PREPARING')

    const response = await ownerAction(t, s, order.id, 'cancel', { reason: 'Acabou o pão' })

    expect(response.json().status).toBe('CANCELED')
  })

  it("should not reach another restaurant's order", async () => {
    const other = await createOrderingScenario(t)
    const order = await placeOrder(t, other)

    const response = await ownerAction(t, s, order.id, 'confirm')

    expect(response.statusCode).toBe(404)
  })

  describe('dispatch', () => {
    const dispatch = (orderId: string, driverMemberId: string) =>
      ownerAction(t, s, orderId, 'dispatch', { driverMemberId })

    it('should assign an active driver of the restaurant', async () => {
      const order = await placeOrder(t, s)
      await advanceOrderTo(t, s, order.id, 'READY')

      const response = await dispatch(order.id, s.driver.member.id)

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        status: 'OUT_FOR_DELIVERY',
        driverMemberId: s.driver.member.id
      })
    })

    it('should refuse an owner as the driver', async () => {
      const order = await placeOrder(t, s)
      await advanceOrderTo(t, s, order.id, 'READY')

      expect((await dispatch(order.id, s.owner.member.id)).statusCode).toBe(422)
    })

    it('should refuse an inactive driver', async () => {
      const order = await placeOrder(t, s)
      await advanceOrderTo(t, s, order.id, 'READY')
      await t.request('PATCH', `/restaurants/${s.restaurant.id}/members/${s.driver.member.id}`, {
        token: s.owner.token,
        body: { active: false }
      })

      expect((await dispatch(order.id, s.driver.member.id)).statusCode).toBe(422)
    })

    it('should refuse a driver from another restaurant', async () => {
      const order = await placeOrder(t, s)
      await advanceOrderTo(t, s, order.id, 'READY')
      const elsewhere = await createStaff(t.db, (await createRestaurant(t.db)).id, 'DRIVER')

      expect((await dispatch(order.id, elsewhere.member.id)).statusCode).toBe(404)
    })

    it('should refuse an order that is not ready', async () => {
      const order = await placeOrder(t, s)

      expect((await dispatch(order.id, s.driver.member.id)).statusCode).toBe(422)
    })
  })
})
