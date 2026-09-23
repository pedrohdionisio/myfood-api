import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { customers, restaurantUsers } from '@/db/schema/index.js'
import { setupTestApp } from '../support/app.js'
import { FAKE_RESET_CODE, tokenFor } from '../support/fakes/index.js'

const t = setupTestApp()

const pools = [
  {
    pool: 'customer' as const,
    auth: '/auth/customers',
    me: '/customers/me',
    key: 'customer',
    table: customers,
    gateway: () => t.fakes.customerAuthGateway
  },
  {
    pool: 'restaurant' as const,
    auth: '/auth/restaurant-users',
    me: '/restaurant-users/me',
    key: 'user',
    table: restaurantUsers,
    gateway: () => t.fakes.restaurantAuthGateway
  }
]

const account = { name: 'Ana Souza', email: 'ana@myfood.test', password: 'Senha123' }

describe.each(pools)('auth ($pool pool)', ({ pool, auth, me, key, table, gateway }) => {
  const signUp = (body: Record<string, unknown> = account) =>
    t.request('POST', `${auth}/sign-up`, { body })

  it('should sign up, persist the identity and return a working session', async () => {
    const response = await signUp({ ...account, phone: '11999990000' })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body[key]).toMatchObject({
      name: account.name,
      email: account.email,
      phone: '11999990000'
    })

    const [row] = await t.db.select().from(table).where(eq(table.email, account.email))
    expect(row?.id).toBe(body[key].id)

    const profile = await t.request('GET', me, { token: body.session.accessToken })
    expect(profile.statusCode).toBe(200)
    expect(profile.json()).toEqual(body[key])
  })

  it('should refuse a second account with the same e-mail', async () => {
    await signUp()

    const response = await signUp()

    expect(response.statusCode).toBe(409)
  })

  it('should reject an invalid body with 422', async () => {
    const response = await signUp({ ...account, email: 'não-é-email', password: '123' })

    expect(response.statusCode).toBe(422)
    expect(response.json().code).toBe('VALIDATION_ERROR')
  })

  it('should sign in with the right password only', async () => {
    await signUp()

    const ok = await t.request('POST', `${auth}/sign-in`, { body: account })
    const wrong = await t.request('POST', `${auth}/sign-in`, {
      body: { ...account, password: 'Errada123' }
    })

    expect(ok.statusCode).toBe(200)
    expect(ok.json()[key].email).toBe(account.email)
    expect(wrong.statusCode).toBe(401)
  })

  it('should refresh a session', async () => {
    const { session } = (await signUp()).json()

    const response = await t.request('POST', `${auth}/refresh`, {
      body: { refreshToken: session.refreshToken }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().accessToken).toBe(session.accessToken)
  })

  it('should answer forgot-password identically for known and unknown e-mails', async () => {
    await signUp()

    const known = await t.request('POST', `${auth}/forgot-password`, {
      body: { email: account.email }
    })
    const unknown = await t.request('POST', `${auth}/forgot-password`, {
      body: { email: 'ninguem@myfood.test' }
    })

    expect(known.statusCode).toBe(unknown.statusCode)
    expect(known.json()).toEqual(unknown.json())
  })

  it('should reset the password with the code', async () => {
    await signUp()

    const reset = await t.request('POST', `${auth}/reset-password`, {
      body: { email: account.email, code: FAKE_RESET_CODE, password: 'NovaSenha123' }
    })
    const signIn = await t.request('POST', `${auth}/sign-in`, {
      body: { email: account.email, password: 'NovaSenha123' }
    })

    expect(reset.statusCode).toBe(200)
    expect(signIn.statusCode).toBe(200)
    expect(gateway().users.get(account.email)?.password).toBe('NovaSenha123')
  })

  it('should update the profile without touching the e-mail', async () => {
    const { session } = (await signUp()).json()

    const response = await t.request('PATCH', me, {
      token: session.accessToken,
      body: { name: 'Ana Lima', phone: null }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ name: 'Ana Lima', phone: null, email: account.email })
  })

  it('should refuse a profile update with nothing to change', async () => {
    const { session } = (await signUp()).json()

    const response = await t.request('PATCH', me, { token: session.accessToken, body: {} })

    expect(response.statusCode).toBe(422)
  })

  it('should refuse a valid token whose identity is not in the database', async () => {
    const response = await t.request('GET', me, { token: tokenFor(pool, 'sub-sem-cadastro') })

    expect(response.statusCode).toBe(401)
  })
})
