import { beforeEach, describe, expect, it } from 'vitest'
import { buildImageKey } from '@/domain/images.js'
import { uuidv7 } from '@/shared/uuid.js'
import { setupTestApp } from '../support/app.js'
import {
  createCategory,
  createProduct,
  createRestaurant,
  createStaff
} from '../support/factories.js'

const t = setupTestApp()

let restaurantId: string
let token: string
let base: string

beforeEach(async () => {
  const restaurant = await createRestaurant(t.db, {}, { openAllWeek: false })
  restaurantId = restaurant.id
  token = (await createStaff(t.db, restaurant.id)).token
  base = `/restaurants/${restaurantId}`
})

const as = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  t.request(method, `${base}${path}`, { token, body })

describe('opening hours', () => {
  it('should replace the whole schedule', async () => {
    await as('PUT', '/opening-hours', {
      shifts: [{ dayOfWeek: 1, opensAt: '08:00', closesAt: '12:00' }]
    })

    const response = await as('PUT', '/opening-hours', {
      shifts: [
        { dayOfWeek: 5, opensAt: '18:00', closesAt: '02:00' },
        { dayOfWeek: 6, opensAt: '18:00', closesAt: '23:00' }
      ]
    })
    const listed = await as('GET', '/opening-hours')

    expect(response.statusCode).toBe(200)
    expect(listed.json().map(({ dayOfWeek }: { dayOfWeek: number }) => dayOfWeek)).toEqual([5, 6])
  })

  it('should refuse overlapping shifts and keep the previous schedule', async () => {
    await as('PUT', '/opening-hours', {
      shifts: [{ dayOfWeek: 1, opensAt: '08:00', closesAt: '12:00' }]
    })

    const response = await as('PUT', '/opening-hours', {
      shifts: [
        { dayOfWeek: 5, opensAt: '18:00', closesAt: '02:00' },
        { dayOfWeek: 6, opensAt: '01:00', closesAt: '05:00' }
      ]
    })
    const listed = await as('GET', '/opening-hours')

    expect(response.statusCode).toBe(422)
    expect(listed.json()).toHaveLength(1)
  })
})

describe('cuisines', () => {
  it('should list the seeded categories and replace the restaurant ones', async () => {
    const categories = (await t.request('GET', '/cuisine-categories')).json()
    const chosen = categories.slice(0, 2).map(({ id }: { id: string }) => id)

    const replaced = await as('PUT', '/cuisines', { cuisineCategoryIds: chosen })
    const listed = await as('GET', '/cuisines')

    expect(categories.length).toBeGreaterThan(0)
    expect(replaced.statusCode).toBe(200)
    expect(
      listed
        .json()
        .map(({ id }: { id: string }) => id)
        .sort()
    ).toEqual([...chosen].sort())
  })

  it('should refuse an unknown cuisine', async () => {
    const response = await as('PUT', '/cuisines', { cuisineCategoryIds: [uuidv7()] })

    expect(response.statusCode).toBe(422)
  })
})

describe('menu categories', () => {
  it('should create categories in order and reorder them', async () => {
    const first = (await as('POST', '/menu-categories', { name: 'Lanches' })).json()
    const second = (await as('POST', '/menu-categories', { name: 'Bebidas' })).json()

    const reordered = await as('PATCH', '/menu-categories/reorder', { ids: [second.id, first.id] })

    expect(reordered.statusCode).toBe(200)
    expect(reordered.json().map(({ name }: { name: string }) => name)).toEqual([
      'Bebidas',
      'Lanches'
    ])
  })

  it('should require every active category when reordering', async () => {
    const first = (await as('POST', '/menu-categories', { name: 'Lanches' })).json()
    await as('POST', '/menu-categories', { name: 'Bebidas' })

    const response = await as('PATCH', '/menu-categories/reorder', { ids: [first.id] })

    expect(response.statusCode).toBe(422)
  })

  it('should refuse a duplicate name ignoring accents and case', async () => {
    await as('POST', '/menu-categories', { name: 'Açaí' })

    const response = await as('POST', '/menu-categories', { name: 'acai' })

    expect(response.statusCode).toBe(409)
  })

  it('should rename a category', async () => {
    const category = (await as('POST', '/menu-categories', { name: 'Lanches' })).json()

    const response = await as('PATCH', `/menu-categories/${category.id}`, { name: 'Sanduíches' })

    expect(response.json().name).toBe('Sanduíches')
  })

  it('should refuse to archive a category with active products', async () => {
    const category = await createCategory(t.db, restaurantId)
    await createProduct(t.db, restaurantId, category.id)

    const response = await as('DELETE', `/menu-categories/${category.id}`)

    expect(response.statusCode).toBe(422)
    expect(response.json().details).toEqual({ activeProducts: 1 })
  })

  it('should archive an empty category and free its name', async () => {
    const category = (await as('POST', '/menu-categories', { name: 'Bebidas' })).json()

    const archived = await as('DELETE', `/menu-categories/${category.id}`)
    const recreated = await as('POST', '/menu-categories', { name: 'Bebidas' })

    expect(archived.statusCode).toBe(200)
    expect(archived.json().archivedAt).not.toBeNull()
    expect(recreated.statusCode).toBe(201)
  })
})

describe('products', () => {
  it('should create a product with an image from the same restaurant', async () => {
    const category = await createCategory(t.db, restaurantId)
    const imageKey = buildImageKey(restaurantId, 'PRODUCT_IMAGE', uuidv7())

    const response = await as('POST', '/products', {
      menuCategoryId: category.id,
      name: 'X-Salada',
      priceCents: 2890,
      imageKey
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      name: 'X-Salada',
      priceCents: 2890,
      isAvailable: true,
      imageUrls: { lg: `https://media.test/media/${imageKey}/lg.webp` }
    })
  })

  it('should refuse a category from another restaurant', async () => {
    const other = await createRestaurant(t.db)
    const foreign = await createCategory(t.db, other.id)

    const response = await as('POST', '/products', {
      menuCategoryId: foreign.id,
      name: 'X-Salada',
      priceCents: 2890
    })

    expect(response.statusCode).toBe(404)
  })

  it('should refuse an archived category', async () => {
    const category = await createCategory(t.db, restaurantId, { archivedAt: new Date() })

    const response = await as('POST', '/products', {
      menuCategoryId: category.id,
      name: 'X-Salada',
      priceCents: 2890
    })

    expect(response.statusCode).toBe(422)
  })

  it('should refuse an image key of another kind', async () => {
    const category = await createCategory(t.db, restaurantId)

    const response = await as('POST', '/products', {
      menuCategoryId: category.id,
      name: 'X-Salada',
      priceCents: 2890,
      imageKey: buildImageKey(restaurantId, 'RESTAURANT_LOGO', uuidv7())
    })

    expect(response.statusCode).toBe(422)
  })

  it('should update price and availability', async () => {
    const category = await createCategory(t.db, restaurantId)
    const product = await createProduct(t.db, restaurantId, category.id)

    const updated = await as('PATCH', `/products/${product.id}`, { priceCents: 3100 })
    const unavailable = await as('PATCH', `/products/${product.id}/availability`, {
      isAvailable: false
    })

    expect(updated.json().priceCents).toBe(3100)
    expect(unavailable.json().isAvailable).toBe(false)
  })

  it('should filter by category and reorder within it', async () => {
    const lanches = await createCategory(t.db, restaurantId)
    const bebidas = await createCategory(t.db, restaurantId)
    const a = await createProduct(t.db, restaurantId, lanches.id, { position: 0 })
    const b = await createProduct(t.db, restaurantId, lanches.id, { position: 1 })
    await createProduct(t.db, restaurantId, bebidas.id)

    const reordered = await as('PATCH', '/products/reorder', {
      menuCategoryId: lanches.id,
      ids: [b.id, a.id]
    })
    const listed = await t.request('GET', `${base}/products`, {
      token,
      query: { menuCategoryId: lanches.id }
    })

    expect(reordered.statusCode).toBe(200)
    expect(listed.json().map(({ id }: { id: string }) => id)).toEqual([b.id, a.id])
  })

  it('should archive a product instead of deleting it', async () => {
    const category = await createCategory(t.db, restaurantId)
    const product = await createProduct(t.db, restaurantId, category.id)

    const response = await as('DELETE', `/products/${product.id}`)

    expect(response.statusCode).toBe(200)
    expect(response.json().archivedAt).not.toBeNull()
  })
})
