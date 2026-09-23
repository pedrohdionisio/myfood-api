import { describe, expect, it } from 'vitest'
import type { ICustomersRepository } from '@/application/interfaces/ICustomersRepository.js'
import type { IRestaurantUsersRepository } from '@/application/interfaces/IRestaurantUsersRepository.js'
import { SignUpCustomerUseCase } from '@/application/useCases/auth/SignUpCustomerUseCase.js'
import { SignUpRestaurantUserUseCase } from '@/application/useCases/auth/SignUpRestaurantUserUseCase.js'
import { FakeAuthGateway, type Pool } from '../../support/fakes/index.js'

type Create = (data: { name: string; email: string }) => Promise<unknown>

interface ISignUp {
  execute(input: { name: string; email: string; password: string }): Promise<unknown>
}

const useCases: [Pool, (create: Create, auth: FakeAuthGateway) => ISignUp][] = [
  [
    'customer',
    (create, auth) => new SignUpCustomerUseCase({ create } as unknown as ICustomersRepository, auth)
  ],
  [
    'restaurant',
    (create, auth) =>
      new SignUpRestaurantUserUseCase({ create } as unknown as IRestaurantUsersRepository, auth)
  ]
]

const input = { name: 'Ana', email: 'ana@myfood.test', password: 'Senha123' }

describe.each(useCases)('sign-up saga (%s pool)', (pool, build) => {
  it('should create the account in Cognito, then in the database, and sign in', async () => {
    const auth = new FakeAuthGateway(pool)
    const created: string[] = []
    const signUp = build(async (data) => {
      created.push(data.email)
      return { id: 'u1', name: data.name, email: data.email, phone: null }
    }, auth)

    const result = await signUp.execute(input)

    expect(created).toEqual([input.email])
    expect(result).toMatchObject({ session: { accessToken: expect.stringMatching(`^${pool}\\.`) } })
    expect(auth.users.has(input.email)).toBe(true)
  })

  it('should delete the Cognito account when the database write fails', async () => {
    const auth = new FakeAuthGateway(pool)
    const failure = new Error('unique violation')
    const signUp = build(async () => {
      throw failure
    }, auth)

    await expect(signUp.execute(input)).rejects.toBe(failure)

    expect(auth.users.has(input.email)).toBe(false)
    expect(auth.deletedEmails).toEqual([input.email])
  })

  it('should not touch the database when Cognito refuses the account', async () => {
    const auth = new FakeAuthGateway(pool)
    await auth.createUser(input)
    let called = false
    const signUp = build(async () => {
      called = true
    }, auth)

    await expect(signUp.execute(input)).rejects.toMatchObject({ statusCode: 409 })

    expect(called).toBe(false)
    expect(auth.deletedEmails).toEqual([])
  })
})
