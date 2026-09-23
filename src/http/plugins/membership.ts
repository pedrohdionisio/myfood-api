import type { FastifyRequest, preHandlerHookHandler } from 'fastify'
import type { DependencyContainer } from 'tsyringe'
import type {
  IMembership,
  IMembershipsRepository
} from '@/application/interfaces/IMembershipsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import type { MemberRole } from '@/domain/enums.js'
import { ForbiddenError } from '@/domain/errors.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import type { App } from '../app.js'
import { requireRestaurantUser } from './auth.js'

declare module 'fastify' {
  interface FastifyRequest {
    membership?: IMembership
  }

  interface FastifyInstance {
    requireMembership: (...allowed: MemberRole[]) => preHandlerHookHandler
  }
}

export function requireMembershipContext(request: FastifyRequest): IMembership {
  if (!request.membership) {
    throw new Error('rota registrada sem o preHandler requireMembership')
  }

  return request.membership
}

export function registerMembership(app: App, container: DependencyContainer): void {
  const memberships = container.resolve<IMembershipsRepository>(TOKENS.MembershipsRepository)

  app.decorateRequest('membership', undefined)

  app.decorate('requireMembership', (...allowed: MemberRole[]): preHandlerHookHandler => {
    // O nome não é decorativo: o transform do OpenAPI identifica a rota escopada por vínculo
    // por ele, e é o que faz o 403 aparecer na documentação sem ninguém declarar.
    return async function requireMembershipPreHandler(request) {
      const user = requireRestaurantUser(request)
      const { restaurantId } = restaurantScopeParamsSchema.parse(request.params)

      const membership = await memberships.findByUserAndRestaurant(user.id, restaurantId)

      // Vínculo inexistente e restaurante inexistente respondem igual, para não confirmar
      // a existência de um restaurante a quem não faz parte dele.
      if (!membership) {
        throw new ForbiddenError(`Usuário ${user.id} não é membro do restaurante ${restaurantId}.`)
      }

      if (!membership.active) {
        throw new ForbiddenError(
          `Vínculo inativo de ${user.id} no restaurante ${restaurantId}.`,
          'Seu acesso a este restaurante foi desativado.'
        )
      }

      if (membership.restaurantStatus === 'SUSPENDED') {
        throw new ForbiddenError(
          `Restaurante ${restaurantId} suspenso.`,
          'Este restaurante está suspenso. Fale com o suporte.'
        )
      }

      if (allowed.length > 0 && !allowed.includes(membership.role)) {
        throw new ForbiddenError(
          `Operação exige ${allowed.join(' ou ')}; o papel é ${membership.role}.`,
          'Você não tem permissão para fazer isso.'
        )
      }

      request.membership = membership
    }
  })
}
