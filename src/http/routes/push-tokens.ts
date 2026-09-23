import type { DependencyContainer } from 'tsyringe'
import type { RegisterPushTokenUseCase } from '@/application/useCases/pushTokens/RegisterPushTokenUseCase.js'
import type { UnregisterPushTokenUseCase } from '@/application/useCases/pushTokens/UnregisterPushTokenUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import {
  pushTokenResponseSchema,
  registerPushTokenBodySchema,
  removedPushTokenResponseSchema,
  unregisterPushTokenBodySchema
} from '@/schemas/push-tokens.js'
import type { App } from '../app.js'
import { requireCustomer, requireRestaurantUser } from '../plugins/auth.js'

const REGISTER_DESCRIPTION =
  'Idempotente: o app pode chamar a cada abertura. Se o token já existir, passa a pertencer a quem está logado agora — inclusive quando o aparelho troca de perfil entre cliente e entregador.'

export function registerPushTokenRoutes(app: App, container: DependencyContainer): void {
  const registerToken = container.resolve<RegisterPushTokenUseCase>(TOKENS.RegisterPushTokenUseCase)
  const unregisterToken = container.resolve<UnregisterPushTokenUseCase>(
    TOKENS.UnregisterPushTokenUseCase
  )

  app.post(
    '/me/push-tokens',
    {
      schema: {
        tags: ['push-tokens'],
        summary: 'Registra o token de push do aparelho para o cliente autenticado',
        description: REGISTER_DESCRIPTION,
        body: registerPushTokenBodySchema,
        response: { 200: pushTokenResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => {
      await registerToken.execute({
        owner: { type: 'CUSTOMER', customerId: requireCustomer(request).id },
        token: request.body.token,
        platform: request.body.platform
      })

      return request.body
    }
  )

  app.delete(
    '/me/push-tokens',
    {
      schema: {
        tags: ['push-tokens'],
        summary: 'Remove o token de push do aparelho, no logout do cliente',
        description:
          'Sem isto o aparelho continuaria recebendo os pedidos de quem saiu. Token de outro dono não é apagado.',
        body: unregisterPushTokenBodySchema,
        response: { 200: removedPushTokenResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => {
      await unregisterToken.execute({
        owner: { type: 'CUSTOMER', customerId: requireCustomer(request).id },
        token: request.body.token
      })

      return { token: request.body.token }
    }
  )

  app.post(
    '/restaurant-users/me/push-tokens',
    {
      schema: {
        tags: ['push-tokens'],
        summary: 'Registra o token de push do aparelho para o entregador autenticado',
        description: REGISTER_DESCRIPTION,
        body: registerPushTokenBodySchema,
        response: { 200: pushTokenResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request) => {
      await registerToken.execute({
        owner: { type: 'RESTAURANT_USER', restaurantUserId: requireRestaurantUser(request).id },
        token: request.body.token,
        platform: request.body.platform
      })

      return request.body
    }
  )

  app.delete(
    '/restaurant-users/me/push-tokens',
    {
      schema: {
        tags: ['push-tokens'],
        summary: 'Remove o token de push do aparelho, no logout do entregador',
        description:
          'Sem isto o aparelho continuaria recebendo as entregas de quem saiu. Token de outro dono não é apagado.',
        body: unregisterPushTokenBodySchema,
        response: { 200: removedPushTokenResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request) => {
      await unregisterToken.execute({
        owner: { type: 'RESTAURANT_USER', restaurantUserId: requireRestaurantUser(request).id },
        token: request.body.token
      })

      return { token: request.body.token }
    }
  )
}
