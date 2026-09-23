import { describe, expect, it } from 'vitest'
import {
  buildImageKey,
  buildImageUrls,
  imageKeyFromOriginalObjectKey,
  isImageKeyOwnedBy,
  originalObjectKey,
  variantObjectKey
} from '@/domain/images.js'

const restaurantId = '0199a1b2-0000-7000-8000-000000000001'
const otherRestaurantId = '0199a1b2-0000-7000-8000-000000000002'
const uploadId = '0199a1b2-0000-7000-8000-0000000000aa'
const imageKey = buildImageKey(restaurantId, 'PRODUCT_IMAGE', uploadId)

describe('image keys', () => {
  it('should round-trip the original object key back to the image key', () => {
    expect(imageKeyFromOriginalObjectKey(originalObjectKey(imageKey))).toBe(imageKey)
  })

  it('should refuse objects outside originals or with an unexpected shape', () => {
    expect(imageKeyFromOriginalObjectKey(variantObjectKey(imageKey, 'sm'))).toBeNull()
    expect(imageKeyFromOriginalObjectKey('originals/restaurants/x/logo/y')).toBeNull()
  })

  it('should only accept a key of the same restaurant and kind', () => {
    expect(isImageKeyOwnedBy(imageKey, restaurantId, 'PRODUCT_IMAGE')).toBe(true)
    expect(isImageKeyOwnedBy(imageKey, otherRestaurantId, 'PRODUCT_IMAGE')).toBe(false)
    expect(isImageKeyOwnedBy(imageKey, restaurantId, 'RESTAURANT_LOGO')).toBe(false)
  })

  it('should build one public URL per variant', () => {
    expect(buildImageUrls('https://cdn.test', imageKey)).toEqual({
      sm: `https://cdn.test/media/${imageKey}/sm.webp`,
      md: `https://cdn.test/media/${imageKey}/md.webp`,
      lg: `https://cdn.test/media/${imageKey}/lg.webp`
    })
  })
})
