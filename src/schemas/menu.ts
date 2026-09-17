import { z } from 'zod'
import type { IPublicMenuCategory } from '@/application/useCases/restaurants/GetPublicMenuUseCase.js'
import { buildImageUrls } from '@/domain/images.js'
import { imageUrlsSchema } from './uploads.js'

export const publicMenuResponseSchema = z.array(
  z.object({
    id: z.uuid(),
    name: z.string(),
    products: z.array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        description: z.string().nullable(),
        priceCents: z.int(),
        imageUrls: imageUrlsSchema.nullable(),
        isAvailable: z.boolean()
      })
    )
  })
)

export function toPublicMenuResponse(
  categories: IPublicMenuCategory[],
  mediaBaseUrl: string
): z.infer<typeof publicMenuResponseSchema> {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: category.products.map((product) => ({
      ...product,
      imageUrls: product.imageKey ? buildImageUrls(mediaBaseUrl, product.imageKey) : null
    }))
  }))
}
