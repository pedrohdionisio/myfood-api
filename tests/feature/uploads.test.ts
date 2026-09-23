import { describe, expect, it } from 'vitest'
import { isImageKeyOwnedBy, MAX_IMAGE_BYTES, originalObjectKey } from '@/domain/images.js'
import { setupTestApp } from '../support/app.js'
import { createRestaurant, createStaff } from '../support/factories.js'

const t = setupTestApp()

describe('image uploads', () => {
  it('should issue a presigned upload under the restaurant prefix', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)

    const response = await t.request('POST', `/restaurants/${restaurant.id}/uploads/images`, {
      token: owner.token,
      body: { kind: 'PRODUCT_IMAGE', contentType: 'image/png' }
    })

    expect(response.statusCode).toBe(201)
    const { imageKey, maxBytes } = response.json()
    expect(isImageKeyOwnedBy(imageKey, restaurant.id, 'PRODUCT_IMAGE')).toBe(true)
    expect(maxBytes).toBe(MAX_IMAGE_BYTES)
    expect(t.fakes.storageGateway.presignedUploads).toEqual([
      expect.objectContaining({
        key: originalObjectKey(imageKey),
        contentType: 'image/png',
        maxBytes: MAX_IMAGE_BYTES
      })
    ])
  })

  it('should reject an unsupported content type', async () => {
    const restaurant = await createRestaurant(t.db)
    const owner = await createStaff(t.db, restaurant.id)

    const response = await t.request('POST', `/restaurants/${restaurant.id}/uploads/images`, {
      token: owner.token,
      body: { kind: 'PRODUCT_IMAGE', contentType: 'image/gif' }
    })

    expect(response.statusCode).toBe(422)
  })
})
