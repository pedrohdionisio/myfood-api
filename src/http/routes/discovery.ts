import type { DependencyContainer } from 'tsyringe'
import type { ListRestaurantsUseCase } from '@/application/useCases/restaurants/ListRestaurantsUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import {
  listRestaurantsQuerySchema,
  listRestaurantsResponseSchema,
  toRestaurantSummaryResponse
} from '@/schemas/restaurants.js'
import type { App } from '../app.js'
import { requireCustomer } from '../plugins/auth.js'

export function registerDiscoveryRoutes(app: App, container: DependencyContainer): void {
  const listRestaurants = container.resolve<ListRestaurantsUseCase>(TOKENS.ListRestaurantsUseCase)
  const mediaBaseUrl = container.resolve<string>(TOKENS.MediaBaseUrl)

  app.get(
    '/restaurants',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Restaurantes ativos que atendem a cidade do endereço do cliente',
        querystring: listRestaurantsQuerySchema,
        response: { 200: listRestaurantsResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => {
      const { addressId, page, perPage } = request.query

      const result = await listRestaurants.execute({
        customerId: requireCustomer(request).id,
        addressId,
        page,
        perPage
      })

      return {
        ...result,
        items: result.items.map((item) => toRestaurantSummaryResponse(item, mediaBaseUrl))
      }
    }
  )
}
