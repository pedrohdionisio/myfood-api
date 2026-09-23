import { describe, expect, it } from 'vitest'
import { calculateLineTotal } from '@/domain/pricing.js'

describe('calculateLineTotal', () => {
  it('should use the product price as the unit price and multiply by quantity', () => {
    expect(calculateLineTotal({ priceCents: 2590, quantity: 3 })).toEqual({
      unitPriceCents: 2590,
      totalCents: 7770
    })
  })

  it('should keep free items at zero', () => {
    expect(calculateLineTotal({ priceCents: 0, quantity: 5 })).toEqual({
      unitPriceCents: 0,
      totalCents: 0
    })
  })
})
