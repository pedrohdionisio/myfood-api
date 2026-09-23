import { describe, expect, it } from 'vitest'
import { missingActivationRequirements } from '@/domain/activation.js'

describe('missingActivationRequirements', () => {
  it('should list every requirement that is not met', () => {
    expect(
      missingActivationRequirements({ hasOpeningHours: false, hasAvailableProduct: false })
    ).toEqual(['OPENING_HOURS', 'AVAILABLE_PRODUCT'])
  })

  it('should be empty when the restaurant is ready', () => {
    expect(
      missingActivationRequirements({ hasOpeningHours: true, hasAvailableProduct: true })
    ).toEqual([])
  })
})
