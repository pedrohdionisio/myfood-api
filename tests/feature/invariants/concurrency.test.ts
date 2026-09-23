import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { deliveryConfirmationAttempts, orders } from '@/db/schema/index.js'
import { MAX_FAILED_CONFIRMATIONS } from '@/domain/delivery.js'
import { uuidv7 } from '@/shared/uuid.js'
import { setupTestApp } from '../../support/app.js'
import {
  advanceOrderTo,
  checkout,
  confirmDelivery,
  createOrderingScenario,
  ownerAction,
  placeOrder,
  statusHistory
} from '../../support/scenarios.js'

const t = setupTestApp()

const statusCodes = (responses: { statusCode: number }[]) =>
  responses.map(({ statusCode }) => statusCode).sort()

describe('concurrency', () => {
  it('should give simultaneous checkouts distinct display numbers (D8)', async () => {
    const s = await createOrderingScenario(t)

    const responses = await Promise.all(Array.from({ length: 8 }, () => checkout(t, s)))

    expect(statusCodes(responses)).toEqual(Array(8).fill(201))
    const numbers = responses.map((response) => response.json().displayNumber).sort((a, b) => a - b)
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('should create a single order for simultaneous requests with the same Idempotency-Key (D2)', async () => {
    const s = await createOrderingScenario(t)
    const key = uuidv7()

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => checkout(t, s, { idempotencyKey: key }))
    )

    expect(responses.every(({ statusCode }) => statusCode === 201 || statusCode === 409)).toBe(true)
    const ids = new Set(
      responses.filter(({ statusCode }) => statusCode === 201).map((r) => r.json().id)
    )
    expect(ids.size).toBe(1)
    expect(await t.db.select({ id: orders.id }).from(orders)).toHaveLength(1)
  })

  it('should deliver exactly once when the code is confirmed twice at the same time (rule 4)', async () => {
    const s = await createOrderingScenario(t)
    const order = await placeOrder(t, s)
    await advanceOrderTo(t, s, order.id, 'OUT_FOR_DELIVERY')

    const responses = await Promise.all([
      confirmDelivery(t, s, order.id, order.deliveryCode),
      confirmDelivery(t, s, order.id, order.deliveryCode)
    ])

    expect(statusCodes(responses)).toEqual([200, 422])
    const delivered = (await statusHistory(t, order.id)).filter(
      ({ toStatus }) => toStatus === 'DELIVERED'
    )
    expect(delivered).toHaveLength(1)
  })

  it('should not let parallel wrong codes get past the attempt limit (rule 4)', async () => {
    const s = await createOrderingScenario(t)
    const order = await placeOrder(t, s)
    await advanceOrderTo(t, s, order.id, 'OUT_FOR_DELIVERY')
    const wrong = order.deliveryCode === '0000' ? '1111' : '0000'

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => confirmDelivery(t, s, order.id, wrong))
    )

    expect(statusCodes(responses)).toEqual([
      ...Array(MAX_FAILED_CONFIRMATIONS).fill(422),
      ...Array(10 - MAX_FAILED_CONFIRMATIONS).fill(429)
    ])
    const attempts = await t.db
      .select()
      .from(deliveryConfirmationAttempts)
      .where(eq(deliveryConfirmationAttempts.orderId, order.id))
    expect(attempts).toHaveLength(MAX_FAILED_CONFIRMATIONS)
  })

  it('should let only one of a customer cancel and an owner confirm win (rule 3)', async () => {
    const s = await createOrderingScenario(t)
    const order = await placeOrder(t, s)

    const [cancel, confirm] = await Promise.all([
      t.request('POST', `/orders/${order.id}/cancel`, { token: s.customer.token, body: {} }),
      ownerAction(t, s, order.id, 'confirm')
    ])

    expect([cancel.statusCode, confirm.statusCode].filter((code) => code === 200)).toHaveLength(1)
    const [row] = await t.db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, order.id))
    const history = await statusHistory(t, order.id)
    expect(history).toHaveLength(2)
    expect(history.at(-1)?.toStatus).toBe(row?.status)
  })
})
