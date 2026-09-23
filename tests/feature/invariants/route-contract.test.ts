import { describe, expect, it } from 'vitest'
import { setupTestApp } from '../../support/app.js'
import { containsProperty, listOperations, operationName } from '../../support/openapi.js'

const t = setupTestApp()

const PUBLIC_OPERATIONS = [
  'GET /health',
  'GET /ready',
  'GET /cuisine-categories',
  'GET /discovery/restaurants/{slug}',
  'GET /discovery/restaurants/{restaurantId}/menu',
  'GET /discovery/restaurants/{slug}/reviews',
  'POST /webhooks/abacatepay',
  ...['customers', 'restaurant-users'].flatMap((pool) =>
    ['sign-up', 'sign-in', 'refresh', 'forgot-password', 'reset-password'].map(
      (action) => `POST /auth/${pool}/${action}`
    )
  )
]

describe('route contract', () => {
  it('should declare deliveryCode only in the three routes of the customer own order (rule 1)', () => {
    const exposing = listOperations(t.app)
      .filter((operation) =>
        Object.entries(operation.responses).some(
          ([status, response]) =>
            status.startsWith('2') && containsProperty(response, 'deliveryCode')
        )
      )
      .map(operationName)

    expect(exposing.sort()).toEqual(
      ['GET /orders/{orderId}', 'POST /orders', 'POST /orders/{orderId}/cancel'].sort()
    )
  })

  it('should require a token on every operation that is not deliberately public', () => {
    const unprotected = listOperations(t.app)
      .filter((operation) => operation.security.length === 0)
      .map(operationName)

    expect(unprotected.sort()).toEqual([...PUBLIC_OPERATIONS].sort())
  })

  it('should scope every restaurant route by token and membership (rule 5)', () => {
    const scoped = listOperations(t.app).filter((operation) =>
      operation.path.startsWith('/restaurants/{restaurantId}')
    )

    expect(scoped.length).toBeGreaterThan(0)
    for (const operation of scoped) {
      expect(operation.security, operationName(operation)).toEqual(['restaurantToken'])
      expect(operation.responses, operationName(operation)).toHaveProperty('403')
    }
  })

  it('should keep customer order routes on the customer pool', () => {
    const orderRoutes = listOperations(t.app).filter(
      (operation) => operation.path.startsWith('/orders') && !operation.path.includes('delivery')
    )

    for (const operation of orderRoutes) {
      expect(operation.security, operationName(operation)).toEqual(['customerToken'])
    }
  })
})
