import { beforeEach, describe, expect, it } from 'vitest'
import { restaurants } from '@/db/schema/index.js'
import { uuidv7 } from '@/shared/uuid.js'
import { setupTestApp } from '../../support/app.js'
import {
  createCustomer,
  createMember,
  createRestaurant,
  createRestaurantUser,
  createStaff
} from '../../support/factories.js'
import { fillPath, listOperations, operationName } from '../../support/openapi.js'

const t = setupTestApp()

// Validação roda antes do preHandler de autenticação no Fastify, então só as rotas sem corpo
// chegam à checagem de token com uma requisição genérica. As demais são cobertas pelo contrato.
const QUERY = { from: '2026-09-01', to: '2026-09-02', q: 'pizza' }

function securedGets(security: string) {
  return listOperations(t.app).filter(
    (operation) =>
      operation.method === 'GET' &&
      operation.security.includes(security) &&
      !operation.path.endsWith('/stream')
  )
}

function call(path: string, token?: string) {
  return t.request('GET', path, { token, query: QUERY })
}

describe('authorization matrix', () => {
  let params: Record<string, string>

  beforeEach(() => {
    params = { restaurantId: uuidv7(), orderId: uuidv7() }
  })

  describe.each([
    ['customerToken', () => createRestaurantUser(t.db)],
    ['restaurantToken', () => createCustomer(t.db)]
  ])('%s routes', (security, createWrongPoolIdentity) => {
    it('should answer 401 without a token, with garbage or with a token of the other pool', async () => {
      const wrongPool = await createWrongPoolIdentity()
      const failures: string[] = []

      for (const operation of securedGets(security)) {
        const path = fillPath(operation.path, params)

        for (const token of [undefined, 'garbage', wrongPool.token]) {
          const response = await call(path, token)
          if (response.statusCode !== 401) {
            failures.push(`${operationName(operation)} [${token}] → ${response.statusCode}`)
          }
        }
      }

      expect(failures).toEqual([])
    })
  })

  describe('restaurant membership (rule 5)', () => {
    let restaurantId: string

    beforeEach(async () => {
      restaurantId = (await createRestaurant(t.db)).id
    })

    async function statusesFor(token: string) {
      const scoped = securedGets('restaurantToken').filter(({ path }) =>
        path.startsWith('/restaurants/{restaurantId}')
      )

      return Promise.all(
        scoped.map(async (operation) => {
          const response = await call(fillPath(operation.path, { restaurantId }), token)
          return `${operationName(operation)} → ${response.statusCode}`
        })
      )
    }

    const allForbidden = (statuses: string[]) => statuses.filter((line) => !line.endsWith('403'))

    it('should forbid a user who is not a member', async () => {
      const outsider = await createStaff(t.db, (await createRestaurant(t.db)).id)

      expect(allForbidden(await statusesFor(outsider.token))).toEqual([])
    })

    it('should forbid an inactive member', async () => {
      const user = await createRestaurantUser(t.db)
      await createMember(t.db, restaurantId, user.id, 'OWNER', { active: false })

      expect(allForbidden(await statusesFor(user.token))).toEqual([])
    })

    it('should forbid every member of a suspended restaurant', async () => {
      const owner = await createStaff(t.db, restaurantId)
      await t.db.update(restaurants).set({ status: 'SUSPENDED' })

      expect(allForbidden(await statusesFor(owner.token))).toEqual([])
    })

    it('should answer the same for an unknown restaurant, without confirming it exists', async () => {
      const owner = await createStaff(t.db, restaurantId)

      const unknown = await call(`/restaurants/${uuidv7()}`, owner.token)
      const foreign = await call(`/restaurants/${(await createRestaurant(t.db)).id}`, owner.token)

      expect(unknown.statusCode).toBe(403)
      expect(unknown.json().message).toBe(foreign.json().message)
    })

    it('should keep drivers out of every restaurant route', async () => {
      const driver = await createStaff(t.db, restaurantId, 'DRIVER')

      expect(allForbidden(await statusesFor(driver.token))).toEqual([])
    })

    it('should let an active owner through', async () => {
      const owner = await createStaff(t.db, restaurantId)

      expect((await statusesFor(owner.token)).filter((line) => !line.endsWith('200'))).toEqual([])
    })
  })
})
