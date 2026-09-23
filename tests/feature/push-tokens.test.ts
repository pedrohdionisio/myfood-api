import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { pushTokens } from '@/db/schema/index.js'
import { setupTestApp } from '../support/app.js'
import { createCustomer, createRestaurantUser } from '../support/factories.js'

const t = setupTestApp()

const device = { token: 'ExponentPushToken[abc123]', platform: 'ANDROID' }

describe('push tokens', () => {
  it('should register and remove a customer device', async () => {
    const customer = await createCustomer(t.db)

    const registered = await t.request('POST', '/me/push-tokens', {
      token: customer.token,
      body: device
    })
    const removed = await t.request('DELETE', '/me/push-tokens', {
      token: customer.token,
      body: { token: device.token }
    })

    expect(registered.statusCode).toBe(200)
    expect(removed.statusCode).toBe(200)
    expect(await t.db.select().from(pushTokens)).toEqual([])
  })

  it('should move a device to whoever signed in on it last', async () => {
    const first = await createCustomer(t.db)
    const second = await createCustomer(t.db)

    await t.request('POST', '/me/push-tokens', { token: first.token, body: device })
    await t.request('POST', '/me/push-tokens', { token: second.token, body: device })

    const rows = await t.db.select().from(pushTokens).where(eq(pushTokens.token, device.token))
    expect(rows).toEqual([expect.objectContaining({ customerId: second.id })])
  })

  it('should move a device between a customer and a restaurant user', async () => {
    const customer = await createCustomer(t.db)
    const user = await createRestaurantUser(t.db)

    await t.request('POST', '/me/push-tokens', { token: customer.token, body: device })
    const response = await t.request('POST', '/restaurant-users/me/push-tokens', {
      token: user.token,
      body: device
    })

    expect(response.statusCode).toBe(200)
    const rows = await t.db.select().from(pushTokens)
    expect(rows).toEqual([expect.objectContaining({ restaurantUserId: user.id, customerId: null })])
  })

  it('should reject a token that is not from Expo', async () => {
    const customer = await createCustomer(t.db)

    const response = await t.request('POST', '/me/push-tokens', {
      token: customer.token,
      body: { ...device, token: 'fcm-token' }
    })

    expect(response.statusCode).toBe(422)
  })

  it("should not remove another user's device", async () => {
    const owner = await createCustomer(t.db)
    const other = await createCustomer(t.db)
    await t.request('POST', '/me/push-tokens', { token: owner.token, body: device })

    await t.request('DELETE', '/me/push-tokens', {
      token: other.token,
      body: { token: device.token }
    })

    expect(await t.db.select().from(pushTokens)).toHaveLength(1)
  })
})
