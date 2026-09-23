import { describe, expect, it } from 'vitest'
import { ORDER_STATUSES, type OrderStatus } from '@/domain/enums.js'
import { DomainError } from '@/domain/errors.js'
import {
  assertCanTransition,
  canTransition,
  initialOrderStatus,
  TRANSITION_ACTORS,
  type TransitionActor,
  timestampFieldsFor
} from '@/domain/order-status.js'

const ALLOWED: [OrderStatus, OrderStatus, TransitionActor][] = [
  ['PENDING_PAYMENT', 'PENDING', 'SYSTEM'],
  ['PENDING_PAYMENT', 'CANCELED', 'SYSTEM'],
  ['PENDING', 'CONFIRMED', 'OWNER'],
  ['PENDING', 'REJECTED', 'OWNER'],
  ['PENDING', 'CANCELED', 'CUSTOMER'],
  ['CONFIRMED', 'PREPARING', 'OWNER'],
  ['CONFIRMED', 'CANCELED', 'OWNER'],
  ['PREPARING', 'READY', 'OWNER'],
  ['PREPARING', 'CANCELED', 'OWNER'],
  ['READY', 'OUT_FOR_DELIVERY', 'OWNER'],
  ['OUT_FOR_DELIVERY', 'DELIVERED', 'DRIVER'],
  ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'DRIVER'],
  ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'OWNER']
]

const isAllowed = (from: OrderStatus, to: OrderStatus, actor: TransitionActor) =>
  ALLOWED.some(([f, t, a]) => f === from && t === to && a === actor)

describe('canTransition', () => {
  it.each(ALLOWED)('should allow %s → %s by %s', (from, to, actor) => {
    expect(canTransition(from, to, actor)).toBe(true)
  })

  it('should deny every other combination of status and actor', () => {
    const unexpected = ORDER_STATUSES.flatMap((from) =>
      ORDER_STATUSES.flatMap((to) =>
        TRANSITION_ACTORS.filter(
          (actor) => !isAllowed(from, to, actor) && canTransition(from, to, actor)
        ).map((actor) => `${from} → ${to} by ${actor}`)
      )
    )

    expect(unexpected).toEqual([])
  })

  it('should never let the customer cancel after the restaurant accepts', () => {
    expect(canTransition('CONFIRMED', 'CANCELED', 'CUSTOMER')).toBe(false)
  })

  it('should never let the driver dispatch or the owner confirm delivery', () => {
    expect(canTransition('READY', 'OUT_FOR_DELIVERY', 'DRIVER')).toBe(false)
    expect(canTransition('OUT_FOR_DELIVERY', 'DELIVERED', 'OWNER')).toBe(false)
  })
})

describe('assertCanTransition', () => {
  it('should throw a DomainError with the attempted transition', () => {
    expect(() => assertCanTransition('DELIVERED', 'CANCELED', 'OWNER')).toThrow(DomainError)

    try {
      assertCanTransition('DELIVERED', 'CANCELED', 'OWNER')
    } catch (error) {
      expect((error as DomainError).details).toEqual({ from: 'DELIVERED', to: 'CANCELED' })
    }
  })
})

describe('initialOrderStatus', () => {
  it('should hold online orders until the payment confirms', () => {
    expect(initialOrderStatus('ONLINE')).toBe('PENDING_PAYMENT')
  })

  it('should send offline payments straight to the restaurant', () => {
    expect(initialOrderStatus('CASH')).toBe('PENDING')
    expect(initialOrderStatus('CARD_ON_DELIVERY')).toBe('PENDING')
  })
})

describe('timestampFieldsFor', () => {
  it('should stamp the milestones and the end of the order', () => {
    expect(timestampFieldsFor('CONFIRMED')).toEqual(['confirmedAt'])
    expect(timestampFieldsFor('OUT_FOR_DELIVERY')).toEqual(['dispatchedAt'])
    expect(timestampFieldsFor('DELIVERED')).toEqual(['deliveredAt', 'finishedAt'])
    expect(timestampFieldsFor('CANCELED')).toEqual(['finishedAt'])
    expect(timestampFieldsFor('PREPARING')).toEqual([])
  })
})
