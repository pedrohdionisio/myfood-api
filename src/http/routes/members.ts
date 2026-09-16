import type { DependencyContainer } from 'tsyringe'
import type { CreateMemberUseCase } from '@/application/useCases/members/CreateMemberUseCase.js'
import type { ListMyRestaurantsUseCase } from '@/application/useCases/members/ListMyRestaurantsUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  createMemberBodySchema,
  memberResponseSchema,
  myRestaurantsResponseSchema
} from '@/schemas/members.js'
import type { App } from '../app.js'
import { requireRestaurantUser } from '../plugins/auth.js'

export function registerMemberRoutes(app: App, container: DependencyContainer): void {
  const createMember = container.resolve<CreateMemberUseCase>(TOKENS.CreateMemberUseCase)
  const listMyRestaurants = container.resolve<ListMyRestaurantsUseCase>(
    TOKENS.ListMyRestaurantsUseCase
  )

  app.get(
    '/restaurant-users/me/restaurants',
    {
      schema: {
        tags: ['restaurant-users'],
        summary: 'Restaurantes em que o usuário tem vínculo ativo',
        response: { 200: myRestaurantsResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request) => listMyRestaurants.execute(requireRestaurantUser(request).id)
  )

  app.post(
    '/restaurants/:restaurantId/members',
    {
      schema: {
        tags: ['members'],
        summary: 'Dono adiciona um membro à equipe',
        params: restaurantScopeParamsSchema,
        body: createMemberBodySchema,
        response: { 201: memberResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request, reply) => {
      const { restaurantId } = request.params
      const result = await createMember.execute(restaurantId, request.body)

      return reply.status(201).send(result)
    }
  )
}
