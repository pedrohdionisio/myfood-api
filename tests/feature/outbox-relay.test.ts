import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import type { RelayOutboxUseCase } from '@/application/useCases/analytics/RelayOutboxUseCase.js'
import { outboxEvents } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { setupTestApp } from '../support/app.js'
import { createOrderingScenario, type OrderingScenario, placeOrder } from '../support/scenarios.js'

const t = setupTestApp()

let s: OrderingScenario

beforeEach(async () => {
  s = await createOrderingScenario(t)
})

function relay() {
  return t.container.resolve<RelayOutboxUseCase>(TOKENS.RelayOutboxUseCase).execute({
    onPublished: () => {},
    onError: () => {}
  })
}

async function outboxRow(orderId: string) {
  const [row] = await t.db
    .select({ publishedAt: outboxEvents.publishedAt, attempts: outboxEvents.attempts })
    .from(outboxEvents)
    .where(eq(outboxEvents.orderId, orderId))
  return row
}

describe('outbox relay', () => {
  it('should wake the relay when an order is placed', async () => {
    await placeOrder(t, s)

    expect(t.fakes.outboxRelayTrigger.wakes).toBeGreaterThan(0)
  })

  it('should publish pending events once and mark them published', async () => {
    const order = await placeOrder(t, s)

    const first = await relay()
    const second = await relay()

    expect(first).toEqual({ published: 1, failed: 0 })
    expect(second).toEqual({ published: 0, failed: 0 })
    expect(t.fakes.eventPublisher.published).toEqual([
      expect.objectContaining({ type: 'ORDER_CREATED', orderId: order.id })
    ])
    expect((await outboxRow(order.id))?.publishedAt).not.toBeNull()
  })

  it('should keep a failed event pending and count the attempt', async () => {
    const order = await placeOrder(t, s)
    const [pending] = await t.db
      .select({ id: outboxEvents.id })
      .from(outboxEvents)
      .where(eq(outboxEvents.orderId, order.id))
    t.fakes.eventPublisher.failingIds.add(pending?.id ?? '')

    const failed = await relay()
    t.fakes.eventPublisher.failingIds.clear()
    const retried = await relay()

    expect(failed).toEqual({ published: 0, failed: 1 })
    expect(retried).toEqual({ published: 1, failed: 0 })
    expect(await outboxRow(order.id)).toMatchObject({ attempts: 1 })
  })
})
