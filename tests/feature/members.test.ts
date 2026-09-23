import { describe, expect, it } from 'vitest'
import { setupTestApp } from '../support/app.js'
import {
  createMember,
  createRestaurant,
  createRestaurantUser,
  createStaff
} from '../support/factories.js'

const t = setupTestApp()

const driverBody = {
  name: 'João Entregador',
  email: 'joao@myfood.test',
  password: 'Senha123',
  role: 'DRIVER'
}

describe('members', () => {
  it('should create a driver with a new account', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)

    const response = await t.request('POST', `/restaurants/${restaurant.id}/members`, {
      token: owner.token,
      body: driverBody
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      membership: { restaurantId: restaurant.id, role: 'DRIVER', active: true },
      user: { email: driverBody.email }
    })
    expect(t.fakes.restaurantAuthGateway.users.has(driverBody.email)).toBe(true)
  })

  it('should link an existing account to a second restaurant without creating it again', async () => {
    const first = await createRestaurant(t.db)
    const second = await createRestaurant(t.db)
    const owner = await createStaff(t.db, second.id)
    const driver = await createRestaurantUser(t.db, { email: driverBody.email })
    await createMember(t.db, first.id, driver.id, 'DRIVER')

    const response = await t.request('POST', `/restaurants/${second.id}/members`, {
      token: owner.token,
      body: driverBody
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().user.id).toBe(driver.id)
    expect(t.fakes.restaurantAuthGateway.users.size).toBe(0)
  })

  it('should refuse to link the same account twice', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)
    await t.request('POST', `/restaurants/${restaurant.id}/members`, {
      token: owner.token,
      body: driverBody
    })

    const response = await t.request('POST', `/restaurants/${restaurant.id}/members`, {
      token: owner.token,
      body: driverBody
    })

    expect(response.statusCode).toBe(409)
  })

  it('should list the team', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)
    const driver = await createStaff(t.db, restaurant.id, 'DRIVER')

    const response = await t.request('GET', `/restaurants/${restaurant.id}/members`, {
      token: owner.token
    })

    expect(
      response
        .json()
        .map((member: { id: string }) => member.id)
        .sort()
    ).toEqual([owner.member.id, driver.member.id].sort())
  })

  it('should deactivate a member, who then loses access', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)
    const other = await createStaff(t.db, restaurant.id, 'OWNER')

    const update = await t.request(
      'PATCH',
      `/restaurants/${restaurant.id}/members/${other.member.id}`,
      { token: owner.token, body: { active: false } }
    )
    const access = await t.request('GET', `/restaurants/${restaurant.id}`, { token: other.token })

    expect(update.statusCode).toBe(200)
    expect(access.statusCode).toBe(403)
  })

  it('should not let an owner change their own membership', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)

    const response = await t.request(
      'PATCH',
      `/restaurants/${restaurant.id}/members/${owner.member.id}`,
      { token: owner.token, body: { active: false } }
    )

    expect(response.statusCode).toBe(403)
  })
})
