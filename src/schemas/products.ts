import { z } from 'zod'
import type { IProduct } from '@/application/interfaces/IProductsRepository.js'
import { buildImageUrls } from '@/domain/images.js'
import { imageUrlsSchema } from './uploads.js'

export const productScopeParamsSchema = z.object({
  restaurantId: z.uuid(),
  productId: z.uuid()
})

export const listProductsQuerySchema = z.object({
  menuCategoryId: z.uuid().optional()
})

export const createProductBodySchema = z.object({
  menuCategoryId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  priceCents: z.int().min(0),
  imageKey: z.string().max(255).optional()
})

export const updateProductBodySchema = z
  .object({
    menuCategoryId: z.uuid(),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).nullable(),
    priceCents: z.int().min(0),
    imageKey: z.string().max(255).nullable()
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Envie ao menos um campo para atualizar.')

export const productAvailabilityBodySchema = z.object({
  isAvailable: z.boolean()
})

export const reorderProductsBodySchema = z.object({
  menuCategoryId: z.uuid(),
  ids: z
    .array(z.uuid())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, 'Não repita ids na ordenação.')
})

export const productResponseSchema = z.object({
  id: z.uuid(),
  menuCategoryId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  priceCents: z.int(),
  imageKey: z.string().nullable(),
  imageUrls: imageUrlsSchema.nullable(),
  position: z.int(),
  isAvailable: z.boolean(),
  archivedAt: z.iso.datetime().nullable()
})

export const productsResponseSchema = z.array(productResponseSchema)

export function toProductResponse(
  product: IProduct,
  mediaBaseUrl: string
): z.infer<typeof productResponseSchema> {
  return {
    ...product,
    imageUrls: product.imageKey ? buildImageUrls(mediaBaseUrl, product.imageKey) : null
  }
}
