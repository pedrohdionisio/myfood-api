import { z } from 'zod'
import type { IProductSearchHit } from '@/application/interfaces/IProductsRepository.js'
import { buildImageUrls } from '@/domain/images.js'
import { restaurantSummaryResponseSchema } from './restaurants.js'
import { imageUrlsSchema } from './uploads.js'

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  addressId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
})

export const searchResponseSchema = z.object({
  restaurants: z.array(restaurantSummaryResponseSchema),
  products: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      description: z.string().nullable(),
      priceCents: z.int(),
      imageUrls: imageUrlsSchema.nullable(),
      isAvailable: z.boolean(),
      restaurant: z.object({
        id: z.uuid(),
        slug: z.string(),
        tradeName: z.string(),
        logoUrls: imageUrlsSchema.nullable()
      })
    })
  )
})

export function toProductHitResponse(
  hit: IProductSearchHit,
  mediaBaseUrl: string
): z.infer<typeof searchResponseSchema>['products'][number] {
  return {
    id: hit.id,
    name: hit.name,
    description: hit.description,
    priceCents: hit.priceCents,
    imageUrls: hit.imageKey ? buildImageUrls(mediaBaseUrl, hit.imageKey) : null,
    isAvailable: hit.isAvailable,
    restaurant: {
      id: hit.restaurantId,
      slug: hit.restaurantSlug,
      tradeName: hit.restaurantTradeName,
      logoUrls: hit.restaurantLogoKey ? buildImageUrls(mediaBaseUrl, hit.restaurantLogoKey) : null
    }
  }
}
