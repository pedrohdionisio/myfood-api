import type { DependencyContainer } from 'tsyringe'
import type { GetAnalyticsUseCase } from '@/application/useCases/analytics/GetAnalyticsUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { analyticsQuerySchema, analyticsResponseSchema } from '@/schemas/analytics.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import type { App } from '../app.js'

export function registerAnalyticsRoutes(app: App, container: DependencyContainer): void {
  const getAnalytics = container.resolve<GetAnalyticsUseCase>(TOKENS.GetAnalyticsUseCase)

  app.get(
    '/restaurants/:restaurantId/analytics',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Números do restaurante no período, lidos só dos agregados diários',
        params: restaurantScopeParamsSchema,
        querystring: analyticsQuerySchema,
        response: { 200: analyticsResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      getAnalytics.execute({ restaurantId: request.params.restaurantId, ...request.query })
  )
}
