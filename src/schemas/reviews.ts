import { z } from 'zod'
import type { IReview, IReviewListItem } from '@/application/interfaces/IReviewsRepository.js'

export const reviewScopeParamsSchema = z.object({
  restaurantId: z.uuid(),
  reviewId: z.uuid()
})

export const createReviewBodySchema = z.object({
  rating: z.int().min(1).max(5),
  comment: z.string().trim().min(3).max(1000).optional()
})

export const replyToReviewBodySchema = z.object({
  reply: z.string().trim().min(3).max(1000)
})

export const reviewPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20)
})

export const reviewResponseSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  restaurantId: z.uuid(),
  rating: z.int(),
  comment: z.string().nullable(),
  reply: z.string().nullable(),
  repliedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime()
})

const reviewListFields = {
  id: z.uuid(),
  rating: z.int(),
  comment: z.string().nullable(),
  reply: z.string().nullable(),
  repliedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime()
}

export const restaurantReviewsResponseSchema = z.object({
  items: z.array(
    z.object({
      ...reviewListFields,
      customerName: z.string(),
      orderId: z.uuid(),
      orderDisplayNumber: z.int()
    })
  ),
  page: z.int(),
  perPage: z.int(),
  hasMore: z.boolean()
})

// A vitrine é pública e sem token: só o primeiro nome de quem avaliou, e nada que ligue a
// avaliação a um pedido específico.
export const publicReviewsResponseSchema = z.object({
  items: z.array(z.object({ ...reviewListFields, customerFirstName: z.string() })),
  page: z.int(),
  perPage: z.int(),
  hasMore: z.boolean()
})

export function toReviewResponse(review: IReview): z.infer<typeof reviewResponseSchema> {
  return review
}

export function toPublicReviewResponse(
  item: IReviewListItem
): z.infer<typeof publicReviewsResponseSchema>['items'][number] {
  return {
    id: item.id,
    rating: item.rating,
    comment: item.comment,
    reply: item.reply,
    repliedAt: item.repliedAt,
    createdAt: item.createdAt,
    customerFirstName: item.customerName.trim().split(/\s+/)[0] ?? item.customerName
  }
}
