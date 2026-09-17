import type { DependencyContainer } from 'tsyringe'
import type { ListRestaurantReviewsUseCase } from '@/application/useCases/reviews/ListRestaurantReviewsUseCase.js'
import type { ReplyToReviewUseCase } from '@/application/useCases/reviews/ReplyToReviewUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  replyToReviewBodySchema,
  restaurantReviewsResponseSchema,
  reviewPageQuerySchema,
  reviewResponseSchema,
  reviewScopeParamsSchema,
  toReviewResponse
} from '@/schemas/reviews.js'
import type { App } from '../app.js'

export function registerRestaurantReviewRoutes(app: App, container: DependencyContainer): void {
  const listReviews = container.resolve<ListRestaurantReviewsUseCase>(
    TOKENS.ListRestaurantReviewsUseCase
  )
  const replyToReview = container.resolve<ReplyToReviewUseCase>(TOKENS.ReplyToReviewUseCase)

  app.get(
    '/restaurants/:restaurantId/reviews',
    {
      schema: {
        tags: ['reviews'],
        summary: 'Avaliações do restaurante, com o nome do cliente e o número do pedido',
        params: restaurantScopeParamsSchema,
        querystring: reviewPageQuerySchema,
        response: { 200: restaurantReviewsResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      listReviews.execute({ restaurantId: request.params.restaurantId, ...request.query })
  )

  app.post(
    '/restaurants/:restaurantId/reviews/:reviewId/reply',
    {
      schema: {
        tags: ['reviews'],
        summary: 'Dono responde uma avaliação, uma única vez',
        params: reviewScopeParamsSchema,
        body: replyToReviewBodySchema,
        response: { 200: reviewResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      toReviewResponse(
        await replyToReview.execute({
          restaurantId: request.params.restaurantId,
          reviewId: request.params.reviewId,
          reply: request.body.reply
        })
      )
  )
}
