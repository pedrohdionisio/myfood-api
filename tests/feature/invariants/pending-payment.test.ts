import { describe, expect, it } from 'vitest'
import { setupTestApp } from '../../support/app.js'
import { drainOutbox } from '../../support/events.js'
import { fillPath, listOperations } from '../../support/openapi.js'
import { createOrderingScenario, ownerAction, placeOrder } from '../../support/scenarios.js'

const t = setupTestApp()

// §12: pedido esperando Pix não existe para o restaurante. Já vazou uma vez, porque as consultas
// do dashboard nunca tinham precisado excluir um status que nada produzia.
describe('an order waiting for payment is invisible to the restaurant (§12)', () => {
  it('should appear in no restaurant or driver read', async () => {
    const s = await createOrderingScenario(t)
    const unpaid = await placeOrder(t, s, { paymentMethod: 'ONLINE' })
    await drainOutbox(t)

    const reads = listOperations(t.app).filter(
      ({ method, path }) =>
        method === 'GET' &&
        path.startsWith('/restaurants/{restaurantId}') &&
        !path.endsWith('/stream')
    )
    const leaks: string[] = []

    for (const operation of reads) {
      for (const query of [{}, { status: 'PENDING_PAYMENT' }]) {
        const response = await t.request(
          'GET',
          fillPath(operation.path, { restaurantId: s.restaurant.id }),
          {
            token: s.owner.token,
            query: { from: '2026-01-01', to: '2030-12-31', ...query }
          }
        )
        if (response.body.includes(unpaid.id)) leaks.push(operation.path)
      }
    }

    const deliveries = await t.request('GET', '/me/deliveries', { token: s.driver.token })
    if (deliveries.body.includes(unpaid.id)) leaks.push('/me/deliveries')

    const analytics = await t.request('GET', `/restaurants/${s.restaurant.id}/analytics`, {
      token: s.owner.token,
      query: { from: '2026-01-01', to: '2030-12-31' }
    })

    expect(leaks).toEqual([])
    expect(analytics.json().totals.ordersCount).toBe(0)
  })

  it('should not be actionable by the restaurant', async () => {
    const s = await createOrderingScenario(t)
    const unpaid = await placeOrder(t, s, { paymentMethod: 'ONLINE' })

    for (const action of ['confirm', 'reject', 'cancel']) {
      expect((await ownerAction(t, s, unpaid.id, action)).statusCode, action).toBe(404)
    }
  })
})
