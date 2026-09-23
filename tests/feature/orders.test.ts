import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openingHours, orders, restaurants } from '@/db/schema/index.js'
import { uuidv7 } from '@/shared/uuid.js'
import { setupTestApp } from '../support/app.js'
import {
  createAddress,
  createCustomer,
  createProduct,
  createRestaurant
} from '../support/factories.js'
import {
  advanceOrderTo,
  checkout,
  createOrderingScenario,
  type OrderingScenario,
  outboxTypes,
  placeOrder,
  statusHistory
} from '../support/scenarios.js'

const t = setupTestApp()

let s: OrderingScenario

beforeEach(async () => {
  s = await createOrderingScenario(t)
})

describe('checkout', () => {
  it('should price the order from the database and place it for the restaurant', async () => {
    const response = await checkout(t, s)

    expect(response.statusCode).toBe(201)
    const order = response.json()
    expect(order).toMatchObject({
      status: 'PENDING',
      paymentMethod: 'CASH',
      subtotalCents: 2 * 2500 + 600,
      deliveryFeeCents: 500,
      totalCents: 2 * 2500 + 600 + 500,
      displayNumber: 1,
      deliveryCity: 'São Paulo'
    })
    expect(order.deliveryCode).toMatch(/^\d{4}$/)
    expect(order.items).toEqual([
      expect.objectContaining({
        productName: 'X-Burger',
        unitPriceCents: 2500,
        quantity: 2,
        totalCents: 5000
      }),
      expect.objectContaining({
        productName: 'Refrigerante',
        unitPriceCents: 600,
        quantity: 1,
        totalCents: 600
      })
    ])
    expect(await statusHistory(t, order.id)).toEqual([
      { fromStatus: null, toStatus: 'PENDING', actorType: 'CUSTOMER' }
    ])
    expect(await outboxTypes(t, order.id)).toEqual(['ORDER_CREATED'])
  })

  it('should ignore any price or total sent by the client (rule 2)', async () => {
    const response = await checkout(t, s, {
      body: {
        subtotalCents: 1,
        deliveryFeeCents: 0,
        totalCents: 1,
        items: [{ productId: s.products.burger.id, quantity: 1, unitPriceCents: 1, totalCents: 1 }]
      }
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      subtotalCents: 2500,
      deliveryFeeCents: 500,
      totalCents: 3000
    })
    expect(response.json().items[0].unitPriceCents).toBe(2500)
  })

  it('should number orders sequentially per restaurant', async () => {
    const first = await placeOrder(t, s)
    const second = await placeOrder(t, s)
    const elsewhere = await placeOrder(t, await createOrderingScenario(t))

    expect([first.displayNumber, second.displayNumber, elsewhere.displayNumber]).toEqual([1, 2, 1])
  })

  it('should hold an online order until payment without announcing it (rule 9)', async () => {
    const order = await placeOrder(t, s, { paymentMethod: 'ONLINE' })

    expect(order.status).toBe('PENDING_PAYMENT')
    expect(await outboxTypes(t, order.id)).toEqual([])
    expect(await statusHistory(t, order.id)).toEqual([
      { fromStatus: null, toStatus: 'PENDING_PAYMENT', actorType: 'CUSTOMER' }
    ])
  })

  it('should accept change for a cash payment covering the total', async () => {
    const response = await checkout(t, s, { body: { changeForCents: 10_000 } })

    expect(response.statusCode).toBe(201)
    expect(response.json().changeForCents).toBe(10_000)
  })

  describe('refusals', () => {
    it('should refuse a restaurant that is not active', async () => {
      const draft = await createRestaurant(t.db, { status: 'DRAFT' })

      const response = await checkout(t, s, { body: { restaurantId: draft.id } })

      expect(response.statusCode).toBe(404)
    })

    it('should refuse a restaurant that paused orders', async () => {
      await t.request('PATCH', `/restaurants/${s.restaurant.id}/accepting-orders`, {
        token: s.owner.token,
        body: { isAcceptingOrders: false }
      })

      expect((await checkout(t, s)).statusCode).toBe(422)
    })

    it('should refuse an address in another city', async () => {
      const rio = await createAddress(t.db, s.customer.id, { city: 'Rio de Janeiro', state: 'RJ' })

      const response = await checkout(t, s, { body: { addressId: rio.id } })

      expect(response.statusCode).toBe(422)
    })

    it("should refuse another customer's address", async () => {
      const other = await createCustomer(t.db)
      const foreign = await createAddress(t.db, other.id)

      const response = await checkout(t, s, { body: { addressId: foreign.id } })

      expect(response.statusCode).toBe(404)
    })

    it('should refuse products from another restaurant or archived', async () => {
      const other = await createOrderingScenario(t)
      const archived = await createProduct(t.db, s.restaurant.id, s.category.id, {
        archivedAt: new Date()
      })

      const response = await checkout(t, s, {
        items: [
          { productId: other.products.burger.id, quantity: 1 },
          { productId: archived.id, quantity: 1 }
        ]
      })

      expect(response.statusCode).toBe(422)
      expect(response.json().details.productIds.sort()).toEqual(
        [other.products.burger.id, archived.id].sort()
      )
    })

    it('should refuse an unavailable product', async () => {
      await t.request(
        'PATCH',
        `/restaurants/${s.restaurant.id}/products/${s.products.soda.id}/availability`,
        { token: s.owner.token, body: { isAvailable: false } }
      )

      const response = await checkout(t, s)

      expect(response.statusCode).toBe(422)
      expect(response.json().details).toEqual({ productIds: [s.products.soda.id] })
    })

    it('should refuse a subtotal below the minimum order', async () => {
      await t.db.update(restaurants).set({ minOrderCents: 10_000 })

      const response = await checkout(t, s)

      expect(response.statusCode).toBe(422)
      expect(response.json().details).toEqual({ minOrderCents: 10_000, subtotalCents: 5600 })
    })

    it('should refuse change for a non-cash payment or below the total', async () => {
      const card = await checkout(t, s, {
        paymentMethod: 'CARD_ON_DELIVERY',
        body: { changeForCents: 10_000 }
      })
      const tooLittle = await checkout(t, s, { body: { changeForCents: 100 } })

      expect(card.statusCode).toBe(422)
      expect(tooLittle.statusCode).toBe(422)
    })

    it('should refuse the same product in two lines', async () => {
      const response = await checkout(t, s, {
        items: [
          { productId: s.products.burger.id, quantity: 1 },
          { productId: s.products.burger.id, quantity: 1 }
        ]
      })

      expect(response.statusCode).toBe(422)
    })

    it('should refuse a request without Idempotency-Key', async () => {
      const response = await t.request('POST', '/orders', {
        token: s.customer.token,
        body: { restaurantId: s.restaurant.id }
      })

      expect(response.statusCode).toBe(422)
    })
  })

  describe('opening hours', () => {
    // Sexta-feira, 2026-09-25. São Paulo é UTC-3.
    beforeEach(async () => {
      await t.db.delete(openingHours).where(eq(openingHours.restaurantId, s.restaurant.id))
      await t.db.insert(openingHours).values({
        restaurantId: s.restaurant.id,
        dayOfWeek: 5,
        opensAt: '11:00',
        closesAt: '15:00'
      })
      vi.useFakeTimers({ toFake: ['Date'] })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should accept an order during a shift', async () => {
      vi.setSystemTime(new Date('2026-09-25T15:00:00Z'))

      expect((await checkout(t, s)).statusCode).toBe(201)
    })

    it('should refuse an order outside the shifts', async () => {
      vi.setSystemTime(new Date('2026-09-25T19:00:00Z'))

      const response = await checkout(t, s)

      expect(response.statusCode).toBe(422)
      expect(response.json().message).toBe('Este restaurante está fechado agora.')
    })
  })

  describe('Idempotency-Key (D2)', () => {
    it('should replay the original order for the same key and body', async () => {
      const key = uuidv7()

      const first = await checkout(t, s, { idempotencyKey: key })
      const replay = await checkout(t, s, { idempotencyKey: key })

      expect(replay.statusCode).toBe(201)
      expect(replay.json().id).toBe(first.json().id)
      expect(await t.db.select({ id: orders.id }).from(orders)).toHaveLength(1)
    })

    it('should refuse the same key with a different body', async () => {
      const key = uuidv7()
      await checkout(t, s, { idempotencyKey: key })

      const response = await checkout(t, s, {
        idempotencyKey: key,
        items: [{ productId: s.products.soda.id, quantity: 3 }]
      })

      expect(response.statusCode).toBe(422)
      expect(await t.db.select({ id: orders.id }).from(orders)).toHaveLength(1)
    })

    it('should scope the key to the customer', async () => {
      const key = uuidv7()
      await checkout(t, s, { idempotencyKey: key })
      const other = await createCustomer(t.db)
      const otherAddress = await createAddress(t.db, other.id)

      const response = await checkout(
        t,
        { ...s, customer: other, address: otherAddress },
        { idempotencyKey: key }
      )

      expect(response.statusCode).toBe(409)
      expect(await t.db.select({ id: orders.id }).from(orders)).toHaveLength(1)
    })
  })
})

describe('customer orders', () => {
  it('should show the order, with its delivery code, only to its customer', async () => {
    const order = await placeOrder(t, s)
    const other = await createCustomer(t.db)

    const own = await t.request('GET', `/orders/${order.id}`, { token: s.customer.token })
    const foreign = await t.request('GET', `/orders/${order.id}`, { token: other.token })

    expect(own.json()).toMatchObject({ id: order.id, deliveryCode: order.deliveryCode })
    expect(foreign.statusCode).toBe(404)
  })

  it('should list the customer orders, newest first', async () => {
    const first = await placeOrder(t, s)
    const second = await placeOrder(t, s)
    await placeOrder(t, await createOrderingScenario(t))

    const response = await t.request('GET', '/orders', { token: s.customer.token })

    expect(response.json().items.map(({ id }: { id: string }) => id)).toEqual([second.id, first.id])
    expect(response.json().items[0]).toMatchObject({
      itemCount: 2,
      hasReview: false,
      restaurant: { id: s.restaurant.id }
    })
  })

  it('should keep an archived product in a past order', async () => {
    const order = await placeOrder(t, s)
    await t.request('DELETE', `/restaurants/${s.restaurant.id}/products/${s.products.burger.id}`, {
      token: s.owner.token
    })

    const response = await t.request('GET', `/orders/${order.id}`, { token: s.customer.token })

    expect(response.json().items[0]).toMatchObject({
      productId: s.products.burger.id,
      productName: 'X-Burger',
      unitPriceCents: 2500
    })
  })

  describe('cancel', () => {
    it('should let the customer cancel before the restaurant accepts', async () => {
      const order = await placeOrder(t, s)

      const response = await t.request('POST', `/orders/${order.id}/cancel`, {
        token: s.customer.token,
        body: { reason: 'Pedi errado' }
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        status: 'CANCELED',
        cancellationReason: 'Pedi errado'
      })
      expect(response.json().finishedAt).not.toBeNull()
      expect(await outboxTypes(t, order.id)).toEqual(['ORDER_CREATED', 'ORDER_CANCELED'])
      expect((await statusHistory(t, order.id)).at(-1)).toEqual({
        fromStatus: 'PENDING',
        toStatus: 'CANCELED',
        actorType: 'CUSTOMER'
      })
    })

    it('should refuse once the restaurant has accepted', async () => {
      const order = await placeOrder(t, s)
      await advanceOrderTo(t, s, order.id, 'CONFIRMED')

      const response = await t.request('POST', `/orders/${order.id}/cancel`, {
        token: s.customer.token,
        body: {}
      })

      expect(response.statusCode).toBe(422)
    })

    it("should refuse another customer's order", async () => {
      const order = await placeOrder(t, s)
      const other = await createCustomer(t.db)

      const response = await t.request('POST', `/orders/${order.id}/cancel`, {
        token: other.token,
        body: {}
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
