import type { DependencyContainer } from 'tsyringe'
import type { ConfirmDeliveryUseCase } from '@/application/useCases/deliveries/ConfirmDeliveryUseCase.js'
import type { FailDeliveryUseCase } from '@/application/useCases/deliveries/FailDeliveryUseCase.js'
import type { ListMyDeliveriesUseCase } from '@/application/useCases/deliveries/ListMyDeliveriesUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import {
  confirmDeliveryBodySchema,
  deliveryOutcomeResponseSchema,
  driverDeliveriesResponseSchema
} from '@/schemas/deliveries.js'
import { orderScopeParamsSchema, reasonBodySchema } from '@/schemas/orders.js'
import type { App } from '../app.js'
import { requireRestaurantUser } from '../plugins/auth.js'

export function registerDeliveryRoutes(app: App, container: DependencyContainer): void {
  const listDeliveries = container.resolve<ListMyDeliveriesUseCase>(TOKENS.ListMyDeliveriesUseCase)
  const confirmDelivery = container.resolve<ConfirmDeliveryUseCase>(TOKENS.ConfirmDeliveryUseCase)
  const failDelivery = container.resolve<FailDeliveryUseCase>(TOKENS.FailDeliveryUseCase)

  app.get(
    '/me/deliveries',
    {
      schema: {
        tags: ['deliveries'],
        summary: 'Entregas em rota atribuídas ao entregador autenticado',
        response: { 200: driverDeliveriesResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request) => listDeliveries.execute(requireRestaurantUser(request).id)
  )

  app.post(
    '/orders/:orderId/confirm-delivery',
    {
      schema: {
        tags: ['deliveries'],
        summary: 'Entregador confirma a entrega com o código de 4 dígitos do cliente',
        params: orderScopeParamsSchema,
        body: confirmDeliveryBodySchema,
        response: { 200: deliveryOutcomeResponseSchema }
      },
      // Complementa o limite de tentativas por pedido do domínio: este segura quem varre vários.
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request) => {
      await confirmDelivery.execute({
        userId: requireRestaurantUser(request).id,
        orderId: request.params.orderId,
        code: request.body.code
      })

      return { orderId: request.params.orderId, status: 'DELIVERED' as const }
    }
  )

  app.post(
    '/orders/:orderId/delivery-failed',
    {
      schema: {
        tags: ['deliveries'],
        summary: 'Entregador registra entrega frustrada, sem exigir código',
        params: orderScopeParamsSchema,
        body: reasonBodySchema,
        response: { 200: deliveryOutcomeResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request) => {
      await failDelivery.execute({
        userId: requireRestaurantUser(request).id,
        orderId: request.params.orderId,
        reason: request.body.reason
      })

      return { orderId: request.params.orderId, status: 'DELIVERY_FAILED' as const }
    }
  )
}
