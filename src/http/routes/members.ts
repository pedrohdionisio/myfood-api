import type { DependencyContainer } from 'tsyringe'
import type { CreateMemberUseCase } from '@/application/useCases/members/CreateMemberUseCase.js'
import type { ListMembersUseCase } from '@/application/useCases/members/ListMembersUseCase.js'
import type { ListMyRestaurantsUseCase } from '@/application/useCases/members/ListMyRestaurantsUseCase.js'
import type { UpdateMemberUseCase } from '@/application/useCases/members/UpdateMemberUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  createMemberBodySchema,
  memberResponseSchema,
  memberScopeParamsSchema,
  myRestaurantsResponseSchema,
  teamMemberResponseSchema,
  teamMembersResponseSchema,
  updateMemberBodySchema
} from '@/schemas/members.js'
import type { App } from '../app.js'
import { requireRestaurantUser } from '../plugins/auth.js'
import { requireMembershipContext } from '../plugins/membership.js'

export function registerMemberRoutes(app: App, container: DependencyContainer): void {
  const createMember = container.resolve<CreateMemberUseCase>(TOKENS.CreateMemberUseCase)
  const listMyRestaurants = container.resolve<ListMyRestaurantsUseCase>(
    TOKENS.ListMyRestaurantsUseCase
  )
  const listMembers = container.resolve<ListMembersUseCase>(TOKENS.ListMembersUseCase)
  const updateMember = container.resolve<UpdateMemberUseCase>(TOKENS.UpdateMemberUseCase)

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

  app.get(
    '/restaurants/:restaurantId/members',
    {
      schema: {
        tags: ['members'],
        summary: 'Equipe do restaurante; é daqui que sai o driverMemberId do despacho',
        params: restaurantScopeParamsSchema,
        response: { 200: teamMembersResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) => listMembers.execute(request.params.restaurantId)
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

  app.patch(
    '/restaurants/:restaurantId/members/:memberId',
    {
      schema: {
        tags: ['members'],
        summary: 'Dono muda o papel de um membro ou desliga o acesso dele',
        params: memberScopeParamsSchema,
        body: updateMemberBodySchema,
        response: { 200: teamMemberResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      updateMember.execute({
        restaurantId: request.params.restaurantId,
        memberId: request.params.memberId,
        actorMembershipId: requireMembershipContext(request).id,
        ...request.body
      })
  )
}
