import { describe, expect, it } from 'vitest'
import type { IPushMessage } from '@/application/interfaces/IPushGateway.js'
import { setupTestApp } from '../../support/app.js'
import { expectNoDeliveryCode } from '../../support/assertions.js'
import { fillPath, listOperations } from '../../support/openapi.js'
import {
  confirmDelivery,
  createOrderingScenario,
  ownerAction,
  placeOrder
} from '../../support/scenarios.js'

const t = setupTestApp()

// Regra 1: o código só pode sair pelas rotas do próprio cliente. Aqui ele é procurado em tudo que
// o restaurante e o entregador conseguem ler, com pedidos em todos os estágios da entrega.
describe('delivery code never leaves the customer (rule 1)', () => {
  it('should be absent from every restaurant, driver and push payload', async () => {
    const s = await createOrderingScenario(t)
    await t.request('POST', '/me/push-tokens', {
      token: s.customer.token,
      body: { token: 'ExponentPushToken[customer]', platform: 'ANDROID' }
    })
    await t.request('POST', '/restaurant-users/me/push-tokens', {
      token: s.driver.token,
      body: { token: 'ExponentPushToken[driver]', platform: 'IOS' }
    })

    const pending = await placeOrder(t, s)
    const outForDelivery = await placeOrder(t, s)
    const delivered = await placeOrder(t, s)
    const codes = [pending, outForDelivery, delivered].map((order) => order.deliveryCode)
    const payloads: [string, unknown][] = []

    for (const [action, body] of [
      ['confirm', {}],
      ['preparing', {}],
      ['ready', {}],
      ['dispatch', { driverMemberId: s.driver.member.id }]
    ] as const) {
      for (const order of [outForDelivery, delivered]) {
        const response = await ownerAction(t, s, order.id, action, body)
        payloads.push([`POST ${action}`, response.json()])
      }
    }
    payloads.push([
      'POST confirm-delivery',
      (await confirmDelivery(t, s, delivered.id, delivered.deliveryCode)).json()
    ])

    const ownerReads = listOperations(t.app).filter(
      ({ method, path }) =>
        method === 'GET' &&
        path.startsWith('/restaurants/{restaurantId}') &&
        !path.endsWith('/stream')
    )
    for (const operation of ownerReads) {
      const response = await t.request(
        'GET',
        fillPath(operation.path, { restaurantId: s.restaurant.id }),
        {
          token: s.owner.token,
          query: { from: '2026-01-01', to: '2030-12-31' }
        }
      )
      expect(response.statusCode, operation.path).toBe(200)
      payloads.push([operation.path, response.json()])
    }

    for (const path of [
      '/me/deliveries',
      '/restaurant-users/me/restaurants',
      '/restaurant-users/me'
    ]) {
      payloads.push([path, (await t.request('GET', path, { token: s.driver.token })).json()])
    }

    const pushes: IPushMessage[] = t.fakes.pushGateway.sent
    expect(pushes.length).toBeGreaterThan(0)
    payloads.push(['push', pushes])

    for (const [source, payload] of payloads) {
      for (const code of codes) {
        try {
          expectNoDeliveryCode(payload, code)
        } catch (error) {
          throw new Error(`código de entrega em ${source}: ${(error as Error).message}`)
        }
      }
    }
  })
})
