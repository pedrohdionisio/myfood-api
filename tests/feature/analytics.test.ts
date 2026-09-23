import { beforeEach, describe, expect, it } from 'vitest'
import { restaurantDailyStats } from '@/db/schema/index.js'
import { toBusinessDate } from '@/domain/time.js'
import { setupTestApp } from '../support/app.js'
import { drainOutbox, processOrderEvent } from '../support/events.js'
import {
  createOrderingScenario,
  deliverOrder,
  type OrderingScenario,
  ownerAction,
  placeOrder
} from '../support/scenarios.js'

const t = setupTestApp()

let s: OrderingScenario
const today = toBusinessDate(new Date())

beforeEach(async () => {
  s = await createOrderingScenario(t)
})

function analytics(query: Record<string, string> = { from: today, to: today }) {
  return t.request('GET', `/restaurants/${s.restaurant.id}/analytics`, {
    token: s.owner.token,
    query
  })
}

describe('analytics', () => {
  it('should aggregate delivered and canceled orders of the day', async () => {
    await deliverOrder(t, s)
    const canceled = await placeOrder(t, s)
    await ownerAction(t, s, canceled.id, 'reject')
    await drainOutbox(t)

    const response = await analytics()

    expect(response.statusCode).toBe(200)
    expect(response.json().totals).toMatchObject({
      ordersCount: 2,
      deliveredCount: 1,
      canceledCount: 1,
      grossRevenueCents: 6100,
      deliveryFeeRevenueCents: 500,
      avgTicketCents: 6100
    })
    expect(response.json().daily).toEqual([
      expect.objectContaining({ date: today, ordersCount: 2 })
    ])
    expect(response.json().topProducts[0]).toMatchObject({
      productId: s.products.burger.id,
      quantity: 2
    })
  })

  it('should not count revenue from an order that was never delivered', async () => {
    await placeOrder(t, s)
    await drainOutbox(t)

    const response = await analytics()

    expect(response.json().totals).toMatchObject({ ordersCount: 1, grossRevenueCents: 0 })
  })

  it('should apply the same message only once (rule 6)', async () => {
    await deliverOrder(t, s)
    const events = await drainOutbox(t)
    const before = await t.db.select().from(restaurantDailyStats)

    const reapplied = await Promise.all(events.map((event) => processOrderEvent(t).execute(event)))

    expect(reapplied.every((applied) => applied === false)).toBe(true)
    expect(await t.db.select().from(restaurantDailyStats)).toEqual(before)
  })

  it('should reject a range that ends before it starts', async () => {
    const response = await analytics({ from: '2026-09-10', to: '2026-09-01' })

    expect(response.statusCode).toBe(422)
  })
})
