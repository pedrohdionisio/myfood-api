import type { DependencyContainer } from 'tsyringe'
import type { ListCuisineCategoriesUseCase } from '@/application/useCases/cuisines/ListCuisineCategoriesUseCase.js'
import type { ListRestaurantCuisinesUseCase } from '@/application/useCases/cuisines/ListRestaurantCuisinesUseCase.js'
import type { ReplaceRestaurantCuisinesUseCase } from '@/application/useCases/cuisines/ReplaceRestaurantCuisinesUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  cuisineCategoriesResponseSchema,
  replaceRestaurantCuisinesBodySchema
} from '@/schemas/cuisines.js'
import type { App } from '../app.js'

export function registerCuisineRoutes(app: App, container: DependencyContainer): void {
  const listCategories = container.resolve<ListCuisineCategoriesUseCase>(
    TOKENS.ListCuisineCategoriesUseCase
  )
  const listRestaurantCuisines = container.resolve<ListRestaurantCuisinesUseCase>(
    TOKENS.ListRestaurantCuisinesUseCase
  )
  const replaceRestaurantCuisines = container.resolve<ReplaceRestaurantCuisinesUseCase>(
    TOKENS.ReplaceRestaurantCuisinesUseCase
  )

  app.get(
    '/cuisine-categories',
    {
      schema: {
        tags: ['cuisines'],
        summary: 'Catálogo de categorias de culinária da plataforma',
        response: { 200: cuisineCategoriesResponseSchema }
      }
    },
    async () => listCategories.execute()
  )

  app.get(
    '/restaurants/:restaurantId/cuisines',
    {
      schema: {
        tags: ['cuisines'],
        summary: 'Categorias de culinária do restaurante',
        params: restaurantScopeParamsSchema,
        response: { 200: cuisineCategoriesResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership()]
    },
    async (request) => listRestaurantCuisines.execute(request.params.restaurantId)
  )

  app.put(
    '/restaurants/:restaurantId/cuisines',
    {
      schema: {
        tags: ['cuisines'],
        summary: 'Dono substitui as categorias de culinária do restaurante',
        params: restaurantScopeParamsSchema,
        body: replaceRestaurantCuisinesBodySchema,
        response: { 200: cuisineCategoriesResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      replaceRestaurantCuisines.execute(
        request.params.restaurantId,
        request.body.cuisineCategoryIds
      )
  )
}
