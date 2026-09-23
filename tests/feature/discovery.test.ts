import { describe, expect, it } from 'vitest'
import { setupTestApp } from '../support/app.js'
import {
  createAddress,
  createCategory,
  createCustomer,
  createProduct,
  createRestaurant,
  createStaff
} from '../support/factories.js'

const t = setupTestApp()

async function customerInSaoPaulo() {
  const customer = await createCustomer(t.db)
  await createAddress(t.db, customer.id, { isDefault: true, city: 'sao paulo' })
  return customer
}

const ids = (response: { json(): { items: { id: string }[] } }) =>
  response.json().items.map(({ id }) => id)

describe('discovery', () => {
  it('should list active restaurants in the customer city that are open now', async () => {
    const customer = await customerInSaoPaulo()
    const open = await createRestaurant(t.db)
    await createRestaurant(t.db, {}, { openAllWeek: false })
    await createRestaurant(t.db, { city: 'Rio de Janeiro', state: 'RJ' })
    await createRestaurant(t.db, { status: 'DRAFT' })

    const response = await t.request('GET', '/discovery/restaurants', { token: customer.token })

    expect(response.statusCode).toBe(200)
    expect(ids(response)).toEqual([open.id])
    expect(response.json().items[0]).toMatchObject({ isOpenNow: true })
    expect(response.json().items[0]).not.toHaveProperty('cnpj')
  })

  it('should include closed restaurants when asked, flagged as closed', async () => {
    const customer = await customerInSaoPaulo()
    const closed = await createRestaurant(t.db, {}, { openAllWeek: false })

    const response = await t.request('GET', '/discovery/restaurants', {
      token: customer.token,
      query: { includeClosed: true }
    })

    expect(response.json().items).toEqual([
      expect.objectContaining({ id: closed.id, isOpenNow: false })
    ])
  })

  it('should paginate the visible restaurants', async () => {
    const customer = await customerInSaoPaulo()
    for (let index = 0; index < 3; index++) {
      await createRestaurant(t.db)
    }

    const first = await t.request('GET', '/discovery/restaurants', {
      token: customer.token,
      query: { perPage: 2 }
    })
    const second = await t.request('GET', '/discovery/restaurants', {
      token: customer.token,
      query: { perPage: 2, page: 2 }
    })

    expect(first.json()).toMatchObject({ hasMore: true })
    expect(second.json()).toMatchObject({ hasMore: false })
    expect(new Set([...ids(first), ...ids(second)]).size).toBe(3)
  })

  it('should filter by cuisine', async () => {
    const customer = await customerInSaoPaulo()
    const pizzeria = await createRestaurant(t.db)
    await createRestaurant(t.db)
    const [cuisine] = (await t.request('GET', '/cuisine-categories')).json()
    const owner = await createStaff(t.db, pizzeria.id)
    await t.request('PUT', `/restaurants/${pizzeria.id}/cuisines`, {
      token: owner.token,
      body: { cuisineCategoryIds: [cuisine.id] }
    })

    const response = await t.request('GET', '/discovery/restaurants', {
      token: customer.token,
      query: { cuisineSlug: cuisine.slug }
    })

    expect(ids(response)).toEqual([pizzeria.id])
    expect(response.json().items[0].cuisines).toEqual([
      { id: cuisine.id, name: cuisine.name, slug: cuisine.slug }
    ])
  })

  it('should ask for an address before listing', async () => {
    const customer = await createCustomer(t.db)

    const response = await t.request('GET', '/discovery/restaurants', { token: customer.token })

    expect(response.statusCode).toBe(422)
    expect(response.json().details).toEqual({ reason: 'NO_ADDRESS' })
  })

  it('should search restaurants and products ignoring accents', async () => {
    const customer = await customerInSaoPaulo()
    const acai = await createRestaurant(t.db, { tradeName: 'Açaí da Praça' })
    const burgers = await createRestaurant(t.db, { tradeName: 'Burger House' })
    const category = await createCategory(t.db, burgers.id)
    const product = await createProduct(t.db, burgers.id, category.id, {
      name: 'Milkshake de açaí'
    })
    await createProduct(t.db, burgers.id, category.id, {
      name: 'Açaí arquivado',
      archivedAt: new Date()
    })

    const response = await t.request('GET', '/discovery/search', {
      token: customer.token,
      query: { q: 'acai' }
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.restaurants.map(({ id }: { id: string }) => id)).toEqual([acai.id])
    expect(body.products.map(({ id }: { id: string }) => id)).toEqual([product.id])
    expect(body.products[0].restaurant.id).toBe(burgers.id)
  })

  it('should not search outside the customer city', async () => {
    const customer = await customerInSaoPaulo()
    await createRestaurant(t.db, { tradeName: 'Açaí Carioca', city: 'Rio de Janeiro', state: 'RJ' })

    const response = await t.request('GET', '/discovery/search', {
      token: customer.token,
      query: { q: 'acai' }
    })

    expect(response.json()).toEqual({ restaurants: [], products: [] })
  })

  describe('public pages', () => {
    it('should show an active restaurant by slug with its schedule and without private data', async () => {
      const restaurant = await createRestaurant(t.db)

      const response = await t.request('GET', `/discovery/restaurants/${restaurant.slug}`)

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ id: restaurant.id, isOpenNow: true })
      expect(response.json().openingHours).toHaveLength(7)
      for (const field of ['cnpj', 'legalName', 'email', 'phone', 'street']) {
        expect(response.json()).not.toHaveProperty(field)
      }
    })

    it('should hide a restaurant that is not active', async () => {
      const draft = await createRestaurant(t.db, { status: 'DRAFT' })

      const page = await t.request('GET', `/discovery/restaurants/${draft.slug}`)
      const menu = await t.request('GET', `/discovery/restaurants/${draft.id}/menu`)

      expect(page.statusCode).toBe(404)
      expect(menu.statusCode).toBe(404)
    })

    it('should serve the menu without archived items or empty categories', async () => {
      const restaurant = await createRestaurant(t.db)
      const lanches = await createCategory(t.db, restaurant.id, { name: 'Lanches', position: 0 })
      await createCategory(t.db, restaurant.id, { name: 'Vazia', position: 1 })
      const arquivada = await createCategory(t.db, restaurant.id, { archivedAt: new Date() })
      const burger = await createProduct(t.db, restaurant.id, lanches.id, { position: 0 })
      const soldOut = await createProduct(t.db, restaurant.id, lanches.id, {
        position: 1,
        isAvailable: false
      })
      await createProduct(t.db, restaurant.id, lanches.id, { archivedAt: new Date() })
      await createProduct(t.db, restaurant.id, arquivada.id)

      const response = await t.request('GET', `/discovery/restaurants/${restaurant.id}/menu`)

      expect(response.json()).toEqual([
        {
          id: lanches.id,
          name: 'Lanches',
          products: [
            expect.objectContaining({ id: burger.id, isAvailable: true }),
            expect.objectContaining({ id: soldOut.id, isAvailable: false })
          ]
        }
      ])
    })
  })
})
