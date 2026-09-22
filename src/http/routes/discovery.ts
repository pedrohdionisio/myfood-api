import type { DependencyContainer } from 'tsyringe'
import type { GetPublicMenuUseCase } from '@/application/useCases/discovery/GetPublicMenuUseCase.js'
import type { GetPublicRestaurantUseCase } from '@/application/useCases/discovery/GetPublicRestaurantUseCase.js'
import type { ListPublicReviewsUseCase } from '@/application/useCases/discovery/ListPublicReviewsUseCase.js'
import type { ListRestaurantsUseCase } from '@/application/useCases/discovery/ListRestaurantsUseCase.js'
import type { SearchUseCase } from '@/application/useCases/discovery/SearchUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import { publicMenuResponseSchema, toPublicMenuResponse } from '@/schemas/menu.js'
import {
  listRestaurantsQuerySchema,
  listRestaurantsResponseSchema,
  publicRestaurantResponseSchema,
  restaurantSlugParamsSchema,
  toPublicRestaurantResponse,
  toRestaurantSummaryResponse
} from '@/schemas/restaurants.js'
import {
  publicReviewsResponseSchema,
  reviewPageQuerySchema,
  toPublicReviewResponse
} from '@/schemas/reviews.js'
import { searchQuerySchema, searchResponseSchema, toProductHitResponse } from '@/schemas/search.js'
import type { App } from '../app.js'
import { requireCustomer } from '../plugins/auth.js'

export function registerDiscoveryRoutes(app: App, container: DependencyContainer): void {
  const listRestaurants = container.resolve<ListRestaurantsUseCase>(TOKENS.ListRestaurantsUseCase)
  const getPublicRestaurant = container.resolve<GetPublicRestaurantUseCase>(
    TOKENS.GetPublicRestaurantUseCase
  )
  const getPublicMenu = container.resolve<GetPublicMenuUseCase>(TOKENS.GetPublicMenuUseCase)
  const search = container.resolve<SearchUseCase>(TOKENS.SearchUseCase)
  const listPublicReviews = container.resolve<ListPublicReviewsUseCase>(
    TOKENS.ListPublicReviewsUseCase
  )
  const mediaBaseUrl = container.resolve<string>(TOKENS.MediaBaseUrl)

  app.get(
    '/discovery/restaurants',
    {
      schema: {
        tags: ['discovery'],
        summary:
          'Restaurantes que atendem a cidade do endereço do cliente, abertos por padrão, com busca e filtro de culinária',
        querystring: listRestaurantsQuerySchema,
        response: { 200: listRestaurantsResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => {
      const { addressId, q, cuisineSlug, includeClosed, page, perPage } = request.query

      const result = await listRestaurants.execute({
        customerId: requireCustomer(request).id,
        addressId,
        term: q,
        cuisineSlug,
        includeClosed,
        page,
        perPage
      })

      return {
        ...result,
        items: result.items.map((item) => toRestaurantSummaryResponse(item, mediaBaseUrl))
      }
    }
  )

  app.get(
    '/discovery/search',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Busca restaurantes e produtos por nome, na cidade do cliente',
        querystring: searchQuerySchema,
        response: { 200: searchResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => {
      const { q, addressId, limit } = request.query

      const result = await search.execute({
        customerId: requireCustomer(request).id,
        addressId,
        term: q,
        limit
      })

      return {
        restaurants: result.restaurants.map((item) =>
          toRestaurantSummaryResponse(item, mediaBaseUrl)
        ),
        products: result.products.map((hit) => toProductHitResponse(hit, mediaBaseUrl))
      }
    }
  )

  app.get(
    '/discovery/restaurants/:slug',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Página pública do restaurante, com a grade de horários',
        params: restaurantSlugParamsSchema,
        response: { 200: publicRestaurantResponseSchema }
      }
    },
    async (request) =>
      toPublicRestaurantResponse(
        await getPublicRestaurant.execute(request.params.slug),
        mediaBaseUrl
      )
  )

  app.get(
    '/discovery/restaurants/:restaurantId/menu',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Cardápio público, por categoria ativa, sem as categorias vazias',
        params: restaurantScopeParamsSchema,
        response: { 200: publicMenuResponseSchema }
      }
    },
    async (request) =>
      toPublicMenuResponse(await getPublicMenu.execute(request.params.restaurantId), mediaBaseUrl)
  )

  app.get(
    '/discovery/restaurants/:slug/reviews',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Avaliações públicas do restaurante, com a resposta do dono quando houver',
        params: restaurantSlugParamsSchema,
        querystring: reviewPageQuerySchema,
        response: { 200: publicReviewsResponseSchema }
      }
    },
    async (request) => {
      const result = await listPublicReviews.execute({
        slug: request.params.slug,
        ...request.query
      })

      return { ...result, items: result.items.map(toPublicReviewResponse) }
    }
  )
}
