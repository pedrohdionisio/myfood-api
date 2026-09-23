import { describe, expect, it } from 'vitest'
import { generateDeliveryCode, resolveDeliveryFee } from '@/domain/delivery.js'

describe('resolveDeliveryFee', () => {
  it('should charge the restaurant fee', () => {
    expect(resolveDeliveryFee({ deliveryFeeCents: 799 })).toBe(799)
  })
})

describe('generateDeliveryCode', () => {
  it('should always produce four digits, zero-padded', () => {
    const codes = Array.from({ length: 500 }, generateDeliveryCode)

    expect(codes.every((code) => /^\d{4}$/.test(code))).toBe(true)
  })
})
