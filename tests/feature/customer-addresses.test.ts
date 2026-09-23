import { describe, expect, it } from 'vitest'
import { setupTestApp } from '../support/app.js'
import { createAddress, createCustomer } from '../support/factories.js'

const t = setupTestApp()

const addressBody = {
  label: 'Casa',
  zipCode: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP'
}

type Address = { id: string; isDefault: boolean }

describe('customer addresses', () => {
  it('should make the first address the default one', async () => {
    const customer = await createCustomer(t.db)

    const response = await t.request('POST', '/customers/me/addresses', {
      token: customer.token,
      body: addressBody
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ ...addressBody, isDefault: true })
  })

  it('should keep a single default when a new one asks for it', async () => {
    const customer = await createCustomer(t.db)
    const first = await createAddress(t.db, customer.id, { isDefault: true })

    const second = (
      await t.request('POST', '/customers/me/addresses', {
        token: customer.token,
        body: { ...addressBody, isDefault: true }
      })
    ).json()
    const listed: Address[] = (
      await t.request('GET', '/customers/me/addresses', { token: customer.token })
    ).json()

    expect(listed.filter((address) => address.isDefault).map(({ id }) => id)).toEqual([second.id])
    expect(listed.map(({ id }) => id)).toContain(first.id)
  })

  it('should switch the default address', async () => {
    const customer = await createCustomer(t.db)
    await createAddress(t.db, customer.id, { isDefault: true })
    const other = await createAddress(t.db, customer.id)

    const response = await t.request('PATCH', `/customers/me/addresses/${other.id}/default`, {
      token: customer.token
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().isDefault).toBe(true)
  })

  it('should promote another address when the default one is deleted', async () => {
    const customer = await createCustomer(t.db)
    const main = await createAddress(t.db, customer.id, { isDefault: true })
    const other = await createAddress(t.db, customer.id)

    const response = await t.request('DELETE', `/customers/me/addresses/${main.id}`, {
      token: customer.token
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([expect.objectContaining({ id: other.id, isDefault: true })])
  })

  it('should update an address', async () => {
    const customer = await createCustomer(t.db)
    const address = await createAddress(t.db, customer.id)

    const response = await t.request('PATCH', `/customers/me/addresses/${address.id}`, {
      token: customer.token,
      body: { number: '2000', complement: null }
    })

    expect(response.json()).toMatchObject({ number: '2000', complement: null })
  })

  it("should never expose or change another customer's address", async () => {
    const owner = await createCustomer(t.db)
    const intruder = await createCustomer(t.db)
    const address = await createAddress(t.db, owner.id)

    const update = await t.request('PATCH', `/customers/me/addresses/${address.id}`, {
      token: intruder.token,
      body: { number: '1' }
    })
    const remove = await t.request('DELETE', `/customers/me/addresses/${address.id}`, {
      token: intruder.token
    })
    const listed = await t.request('GET', '/customers/me/addresses', { token: intruder.token })

    expect(update.statusCode).toBe(404)
    expect(remove.statusCode).toBe(404)
    expect(listed.json()).toEqual([])
  })

  it('should reject a malformed zip code or state', async () => {
    const customer = await createCustomer(t.db)

    const response = await t.request('POST', '/customers/me/addresses', {
      token: customer.token,
      body: { ...addressBody, zipCode: '01310-100', state: 'sp' }
    })

    expect(response.statusCode).toBe(422)
  })
})
