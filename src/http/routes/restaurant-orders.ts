import type { DependencyContainer } from 'tsyringe'
import type { ChangeOrderStatusUseCase } from '@/application/useCases/orders/ChangeOrderStatusUseCase.js'
import type { DispatchOrderUseCase } from '@/application/useCases/orders/DispatchOrderUseCase.js'
import type { ListRestaurantOrdersUseCase } from '@/application/useCases/orders/ListRestaurantOrdersUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import type { OrderStatus } from '@/domain/enums.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  dispatchOrderBodySchema,
  reasonBodySchema,
  restaurantOrderPageQuerySchema,
  restaurantOrderResponseSchema,
  restaurantOrderScopeParamsSchema,
  restaurantOrdersResponseSchema,
  toRestaurantOrderResponse
} from '@/schemas/orders.js'
import type { App } from '../app.js'
import { requireRestaurantUser } from '../plugins/auth.js'

interface ITransitionRoute {
  path: string
  to: OrderStatus
  summary: string
}

const TRANSITIONS: ITransitionRoute[] = [
  { path: 'confirm', to: 'CONFIRMED', summary: 'Dono aceita o pedido' },
  { path: 'reject', to: 'REJECTED', summary: 'Dono recusa o pedido' },
  { path: 'preparing', to: 'PREPARING', summary: 'Dono põe o pedido em preparo' },
  { path: 'ready', to: 'READY', summary: 'Dono marca o pedido como pronto' },
  { path: 'cancel', to: 'CANCELED', summary: 'Dono cancela o pedido' },
  {
    path: 'delivery-failed',
    to: 'DELIVERY_FAILED',
    summary: 'Dono registra entrega frustrada, quando o entregador não consegue'
  }
]

export function registerRestaurantOrderRoutes(app: App, container: DependencyContainer): void {
  const listOrders = container.resolve<ListRestaurantOrdersUseCase>(
    TOKENS.ListRestaurantOrdersUseCase
  )
  const changeStatus = container.resolve<ChangeOrderStatusUseCase>(TOKENS.ChangeOrderStatusUseCase)
  const dispatchOrder = container.resolve<DispatchOrderUseCase>(TOKENS.DispatchOrderUseCase)

  app.get(
    '/restaurants/:restaurantId/orders',
    {
      schema: {
        tags: ['restaurant-orders'],
        summary: 'Pedidos do restaurante, mais recentes primeiro, sem o código de entrega',
        params: restaurantScopeParamsSchema,
        querystring: restaurantOrderPageQuerySchema,
        response: { 200: restaurantOrdersResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) => {
      const result = await listOrders.execute({
        restaurantId: request.params.restaurantId,
        ...request.query
      })

      return { ...result, items: result.items.map(toRestaurantOrderResponse) }
    }
  )

  // As transições do dono diferem só no status de destino, então compartilham o use case, que é
  // quem consulta a máquina de estados.
  for (const transition of TRANSITIONS) {
    app.post(
      `/restaurants/:restaurantId/orders/:orderId/${transition.path}`,
      {
        schema: {
          tags: ['restaurant-orders'],
          summary: transition.summary,
          params: restaurantOrderScopeParamsSchema,
          body: reasonBodySchema,
          response: { 200: restaurantOrderResponseSchema }
        },
        preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
      },
      async (request) =>
        toRestaurantOrderResponse(
          await changeStatus.execute({
            restaurantId: request.params.restaurantId,
            orderId: request.params.orderId,
            to: transition.to,
            actorId: requireRestaurantUser(request).id,
            reason: request.body.reason
          })
        )
    )
  }

  app.post(
    '/restaurants/:restaurantId/orders/:orderId/dispatch',
    {
      schema: {
        tags: ['restaurant-orders'],
        summary: 'Dono despacha o pedido e atribui o entregador',
        params: restaurantOrderScopeParamsSchema,
        body: dispatchOrderBodySchema,
        response: { 200: restaurantOrderResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      toRestaurantOrderResponse(
        await dispatchOrder.execute({
          restaurantId: request.params.restaurantId,
          orderId: request.params.orderId,
          driverMemberId: request.body.driverMemberId,
          actorId: requireRestaurantUser(request).id
        })
      )
  )
}
