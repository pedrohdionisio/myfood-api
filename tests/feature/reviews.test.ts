import { beforeEach, describe, expect, it } from 'vitest'
import { setupTestApp } from '../support/app.js'
import {
  createOrderingScenario,
  deliverOrder,
  type OrderingScenario,
  placeOrder
} from '../support/scenarios.js'

const t = setupTestApp()

let s: OrderingScenario

beforeEach(async () => {
  s = await createOrderingScenario(t)
})

function review(
  orderId: string,
  body: Record<string, unknown> = { rating: 4, comment: 'Muito bom' }
) {
  return t.request('POST', `/orders/${orderId}/review`, { token: s.customer.token, body })
}

describe('reviews', () => {
  it('should review a delivered order and update the restaurant rating', async () => {
    const first = await deliverOrder(t, s)
    const second = await deliverOrder(t, s)

    const created = await review(first.id, { rating: 5, comment: 'Excelente' })
    await review(second.id, { rating: 2 })

    expect(created.statusCode).toBe(201)
    expect(created.json()).toMatchObject({ orderId: first.id, rating: 5, reply: null })
    const restaurant = await t.request('GET', `/restaurants/${s.restaurant.id}`, {
      token: s.owner.token
    })
    expect(restaurant.json()).toMatchObject({ ratingAvg: 3.5, ratingCount: 2 })
    const fetched = await t.request('GET', `/orders/${first.id}/review`, {
      token: s.customer.token
    })
    expect(fetched.json().id).toBe(created.json().id)
  })

  it('should refuse an order that was not delivered', async () => {
    const order = await placeOrder(t, s)

    const response = await review(order.id)

    expect(response.statusCode).toBe(422)
    expect(response.json().details).toEqual({ status: 'PENDING' })
  })

  it('should refuse a second review of the same order', async () => {
    const order = await deliverOrder(t, s)
    await review(order.id)

    expect((await review(order.id)).statusCode).toBe(409)
  })

  it('should mark the order as reviewed in the customer list', async () => {
    const order = await deliverOrder(t, s)
    await review(order.id)

    const list = await t.request('GET', '/orders', { token: s.customer.token })

    expect(list.json().items[0]).toMatchObject({ id: order.id, hasReview: true })
  })

  it('should let the owner reply once', async () => {
    const order = await deliverOrder(t, s)
    const { id } = (await review(order.id)).json()
    const path = `/restaurants/${s.restaurant.id}/reviews/${id}/reply`

    const reply = await t.request('POST', path, {
      token: s.owner.token,
      body: { reply: 'Obrigado!' }
    })
    const again = await t.request('POST', path, {
      token: s.owner.token,
      body: { reply: 'De novo' }
    })

    expect(reply.statusCode).toBe(200)
    expect(reply.json()).toMatchObject({ reply: 'Obrigado!' })
    expect(again.statusCode).toBe(409)
  })

  it('should list reviews for the owner and publicly with only the first name', async () => {
    const order = await deliverOrder(t, s)
    await review(order.id)

    const owner = await t.request('GET', `/restaurants/${s.restaurant.id}/reviews`, {
      token: s.owner.token
    })
    const pub = await t.request('GET', `/discovery/restaurants/${s.restaurant.slug}/reviews`)

    expect(owner.json().items[0]).toMatchObject({
      customerName: s.customer.name,
      orderDisplayNumber: order.displayNumber
    })
    expect(pub.json().items[0].customerFirstName).toBe(s.customer.name.split(' ')[0])
    expect(pub.json().items[0]).not.toHaveProperty('customerName')
    expect(pub.json().items[0]).not.toHaveProperty('orderId')
  })
})
