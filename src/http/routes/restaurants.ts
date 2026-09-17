import type { DependencyContainer } from 'tsyringe'
import type { ActivateRestaurantUseCase } from '@/application/useCases/restaurants/ActivateRestaurantUseCase.js'
import type { CreateRestaurantUseCase } from '@/application/useCases/restaurants/CreateRestaurantUseCase.js'
import type { GetRestaurantUseCase } from '@/application/useCases/restaurants/GetRestaurantUseCase.js'
import type { SetAcceptingOrdersUseCase } from '@/application/useCases/restaurants/SetAcceptingOrdersUseCase.js'
import type { UpdateRestaurantUseCase } from '@/application/useCases/restaurants/UpdateRestaurantUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  acceptingOrdersBodySchema,
  activateRestaurantBodySchema,
  createRestaurantBodySchema,
  restaurantResponseSchema,
  toRestaurantResponse,
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
  const activateRestaurant = container.resolve<ActivateRestaurantUseCase>(
    TOKENS.ActivateRestaurantUseCase
  )
  const setAcceptingOrders = container.resolve<SetAcceptingOrdersUseCase>(
    TOKENS.SetAcceptingOrdersUseCase
  )
  const mediaBaseUrl = container.resolve<string>(TOKENS.MediaBaseUrl)

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

      const restaurant = await createRestaurant.execute(owner.id, request.body)

      return reply.status(201).send(toRestaurantResponse(restaurant, mediaBaseUrl))
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
    async (request) =>
      toRestaurantResponse(await getRestaurant.execute(request.params.restaurantId), mediaBaseUrl)
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
    async (request) =>
      toRestaurantResponse(
        await updateRestaurant.execute(request.params.restaurantId, request.body),
        mediaBaseUrl
      )
  )

  app.patch(
    '/restaurants/:restaurantId/status',
    {
      schema: {
        tags: ['restaurants'],
        summary: 'Dono publica o restaurante, se o checklist de ativação estiver completo',
        params: restaurantScopeParamsSchema,
        body: activateRestaurantBodySchema,
        response: { 200: restaurantResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      toRestaurantResponse(
        await activateRestaurant.execute(request.params.restaurantId),
        mediaBaseUrl
      )
  )

  app.patch(
    '/restaurants/:restaurantId/accepting-orders',
    {
      schema: {
        tags: ['restaurants'],
        summary: 'Dono pausa ou retoma o recebimento de pedidos',
        params: restaurantScopeParamsSchema,
        body: acceptingOrdersBodySchema,
        response: { 200: restaurantResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      toRestaurantResponse(
        await setAcceptingOrders.execute(
          request.params.restaurantId,
          request.body.isAcceptingOrders
        ),
        mediaBaseUrl
      )
  )
}
