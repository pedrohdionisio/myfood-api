import type { DependencyContainer } from 'tsyringe'
import type { CreateRestaurantUseCase } from '@/application/useCases/restaurants/CreateRestaurantUseCase.js'
import type { GetRestaurantUseCase } from '@/application/useCases/restaurants/GetRestaurantUseCase.js'
import type { UpdateRestaurantUseCase } from '@/application/useCases/restaurants/UpdateRestaurantUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  createRestaurantBodySchema,
  restaurantResponseSchema,
  updateRestaurantBodySchema
} from '@/schemas/restaurants.js'
import type { App } from '../app.js'
import { requireRestaurantUser } from '../plugins/auth.js'

export function registerRestaurantRoutes(app: App, container: DependencyContainer): void {
  const createRestaurant = container.resolve<CreateRestaurantUseCase>(
    TOKENS.CreateRestaurantUseCase
  )
  const getRestaurant = container.resolve<GetRestaurantUseCase>(TOKENS.GetRestaurantUseCase)
  const updateRestaurant = container.resolve<UpdateRestaurantUseCase>(
    TOKENS.UpdateRestaurantUseCase
  )

  app.post(
    '/restaurants',
    {
      schema: {
        tags: ['restaurants'],
        summary: 'Cria um restaurante em DRAFT e torna quem criou o dono',
        body: createRestaurantBodySchema,
        response: { 201: restaurantResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request, reply) => {
      const owner = requireRestaurantUser(request)

      return reply.status(201).send(await createRestaurant.execute(owner.id, request.body))
    }
  )

  app.get(
    '/restaurants/:restaurantId',
    {
      schema: {
        tags: ['restaurants'],
        summary: 'Dados do restaurante para quem tem vínculo ativo',
        params: restaurantScopeParamsSchema,
        response: { 200: restaurantResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership()]
    },
    async (request) => getRestaurant.execute(request.params.restaurantId)
  )

  app.patch(
    '/restaurants/:restaurantId',
    {
      schema: {
        tags: ['restaurants'],
        summary: 'Dono edita cadastro, endereço, taxa de entrega e pedido mínimo',
        params: restaurantScopeParamsSchema,
        body: updateRestaurantBodySchema,
        response: { 200: restaurantResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) => updateRestaurant.execute(request.params.restaurantId, request.body)
  )
}
