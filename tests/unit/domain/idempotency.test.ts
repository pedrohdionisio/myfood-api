import { describe, expect, it } from 'vitest'
import {
  fingerprintCheckout,
  type ICheckoutFingerprintSource,
  IDEMPOTENCY_KEY_TTL_MS,
  idempotencyWindowStart
} from '@/domain/idempotency.js'

const base: ICheckoutFingerprintSource = {
  restaurantId: 'r1',
  addressId: 'a1',
  paymentMethod: 'CASH',
  items: [
    { productId: 'p1', quantity: 2 },
    { productId: 'p2', quantity: 1, notes: 'sem gelo' }
  ]
}

describe('fingerprintCheckout', () => {
  it('should ignore the order of the items', () => {
    expect(fingerprintCheckout({ ...base, items: [...base.items].reverse() })).toBe(
      fingerprintCheckout(base)
    )
  })

  it('should treat a missing optional field like an absent one', () => {
    expect(fingerprintCheckout({ ...base, notes: undefined })).toBe(fingerprintCheckout(base))
  })

  it.each([
    ['quantity', { items: [{ productId: 'p1', quantity: 3 }, base.items[1]] }],
    ['payment method', { paymentMethod: 'ONLINE' as const }],
    ['address', { addressId: 'a2' }],
    ['change', { changeForCents: 5000 }],
    ['notes', { notes: 'portão azul' }]
  ])('should change when the %s changes', (_, change) => {
    expect(fingerprintCheckout({ ...base, ...change } as ICheckoutFingerprintSource)).not.toBe(
      fingerprintCheckout(base)
    )
  })
})

describe('idempotencyWindowStart', () => {
  it('should start 24 hours before now', () => {
    const now = new Date('2026-09-25T12:00:00Z')

    expect(now.getTime() - idempotencyWindowStart(now).getTime()).toBe(IDEMPOTENCY_KEY_TTL_MS)
    expect(IDEMPOTENCY_KEY_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })
})
