import { and, eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { restaurantMembers } from '@/db/schema/index.js'
import { buildImageKey } from '@/domain/images.js'
import { uuidv7 } from '@/shared/uuid.js'
import { setupTestApp } from '../support/app.js'
import {
  createCategory,
  createProduct,
  createRestaurant,
  createRestaurantUser,
  createStaff,
  generateCnpj
} from '../support/factories.js'

const t = setupTestApp()

function restaurantBody(overrides: Record<string, unknown> = {}) {
  return {
    legalName: 'Pizza Boa LTDA',
    tradeName: 'Pizza Boa',
    cnpj: generateCnpj(),
    zipCode: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    ...overrides
  }
}

async function createViaApi(token: string, overrides: Record<string, unknown> = {}) {
  const response = await t.request('POST', '/restaurants', {
    token,
    body: restaurantBody(overrides)
  })
  expect(response.statusCode, response.body).toBe(201)
  return response.json()
}

describe('restaurants', () => {
  it('should create a draft restaurant and make the creator its owner', async () => {
    const user = await createRestaurantUser(t.db)

    const restaurant = await createViaApi(user.token)

    expect(restaurant).toMatchObject({
      slug: 'pizza-boa',
      status: 'DRAFT',
      isAcceptingOrders: false
    })
    const [membership] = await t.db
      .select()
      .from(restaurantMembers)
      .where(
        and(
          eq(restaurantMembers.restaurantId, restaurant.id),
          eq(restaurantMembers.userId, user.id)
        )
      )
    expect(membership).toMatchObject({ role: 'OWNER', active: true })

    const mine = await t.request('GET', '/restaurant-users/me/restaurants', { token: user.token })
    expect(mine.json()).toEqual([
      {
        restaurantId: restaurant.id,
        tradeName: 'Pizza Boa',
        role: 'OWNER',
        restaurantStatus: 'DRAFT'
      }
    ])
  })

  it('should give each restaurant a distinct slug for the same trade name', async () => {
    const user = await createRestaurantUser(t.db)

    const first = await createViaApi(user.token)
    const second = await createViaApi(user.token)

    expect(first.slug).not.toBe(second.slug)
  })

  it('should reject an invalid CNPJ', async () => {
    const user = await createRestaurantUser(t.db)

    const response = await t.request('POST', '/restaurants', {
      token: user.token,
      body: restaurantBody({ cnpj: '11222333000182' })
    })

    expect(response.statusCode).toBe(422)
  })

  it('should refuse a CNPJ already registered', async () => {
    const user = await createRestaurantUser(t.db)
    const cnpj = generateCnpj()
    await createViaApi(user.token, { cnpj })

    const response = await t.request('POST', '/restaurants', {
      token: user.token,
      body: restaurantBody({ cnpj })
    })

    expect(response.statusCode).toBe(409)
  })

  it('should update the restaurant and expose image URLs for its own keys', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)
    const logoKey = buildImageKey(restaurant.id, 'RESTAURANT_LOGO', uuidv7())

    const response = await t.request('PATCH', `/restaurants/${restaurant.id}`, {
      token: owner.token,
      body: { tradeName: 'Novo Nome', deliveryFeeCents: 0, logoKey }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      tradeName: 'Novo Nome',
      deliveryFeeCents: 0,
      logoKey,
      logoUrls: { sm: `https://media.test/media/${logoKey}/sm.webp` }
    })
  })

  it('should refuse an image key from another restaurant', async () => {
    const restaurant = await createRestaurant(t.db)
    const other = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)

    const response = await t.request('PATCH', `/restaurants/${restaurant.id}`, {
      token: owner.token,
      body: { logoKey: buildImageKey(other.id, 'RESTAURANT_LOGO', uuidv7()) }
    })

    expect(response.statusCode).toBe(422)
  })

  describe('activation', () => {
    it('should list what is missing and refuse to activate', async () => {
      const restaurant = await createRestaurant(t.db, { status: 'DRAFT' }, { openAllWeek: false })
      const owner = await createStaff(t.db, restaurant.id)

      const checklist = await t.request(
        'GET',
        `/restaurants/${restaurant.id}/activation-checklist`,
        { token: owner.token }
      )
      const activate = await t.request('PATCH', `/restaurants/${restaurant.id}/status`, {
        token: owner.token,
        body: { status: 'ACTIVE' }
      })

      expect(checklist.json()).toEqual({
        isReadyToActivate: false,
        requirements: [
          { code: 'OPENING_HOURS', isMet: false },
          { code: 'AVAILABLE_PRODUCT', isMet: false }
        ]
      })
      expect(activate.statusCode).toBe(422)
      expect(activate.json().details).toEqual({ missing: ['OPENING_HOURS', 'AVAILABLE_PRODUCT'] })
    })

    it('should not count an unavailable product', async () => {
      const restaurant = await createRestaurant(t.db, { status: 'DRAFT' })
      const owner = await createStaff(t.db, restaurant.id)
      const category = await createCategory(t.db, restaurant.id)
      await createProduct(t.db, restaurant.id, category.id, { isAvailable: false })

      const activate = await t.request('PATCH', `/restaurants/${restaurant.id}/status`, {
        token: owner.token,
        body: { status: 'ACTIVE' }
      })

      expect(activate.json().details).toEqual({ missing: ['AVAILABLE_PRODUCT'] })
    })

    it('should activate once the checklist is met', async () => {
      const restaurant = await createRestaurant(t.db, { status: 'DRAFT' })
      const owner = await createStaff(t.db, restaurant.id)
      const category = await createCategory(t.db, restaurant.id)
      await createProduct(t.db, restaurant.id, category.id)

      const activate = await t.request('PATCH', `/restaurants/${restaurant.id}/status`, {
        token: owner.token,
        body: { status: 'ACTIVE' }
      })

      expect(activate.statusCode).toBe(200)
      expect(activate.json().status).toBe('ACTIVE')
    })
  })

  it('should pause and resume orders', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)

    const paused = await t.request('PATCH', `/restaurants/${restaurant.id}/accepting-orders`, {
      token: owner.token,
      body: { isAcceptingOrders: false }
    })

    expect(paused.statusCode).toBe(200)
    expect(paused.json().isAcceptingOrders).toBe(false)
  })
})
