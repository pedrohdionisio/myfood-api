import type { DependencyContainer } from 'tsyringe'
import type { IOrderStream } from '@/application/interfaces/IOrderStream.js'
import type { ChangeOrderStatusUseCase } from '@/application/useCases/orders/ChangeOrderStatusUseCase.js'
import type { DispatchOrderUseCase } from '@/application/useCases/orders/DispatchOrderUseCase.js'
import type { ListRestaurantOrdersUseCase } from '@/application/useCases/orders/ListRestaurantOrdersUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import type { OrderStatus } from '@/domain/enums.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  dispatchOrderBodySchema,
  orderStreamEventSchema,
  reasonBodySchema,
  restaurantOrderPageQuerySchema,
  restaurantOrderResponseSchema,
  restaurantOrderScopeParamsSchema,
  restaurantOrdersResponseSchema,
  toRestaurantOrderResponse
} from '@/schemas/orders.js'
import type { App } from '../app.js'
import { requireRestaurantUser } from '../plugins/auth.js'

const HEARTBEAT_INTERVAL_MS = 25_000
const RECONNECT_DELAY_MS = 3_000

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
  const orderStream = container.resolve<IOrderStream>(TOKENS.OrderStream)
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

  app.get(
    '/restaurants/:restaurantId/orders/stream',
    {
      schema: {
        tags: ['restaurant-orders'],
        summary: 'Stream SSE dos pedidos do restaurante',
        description:
          'text/event-stream com os eventos ORDER_PLACED e ORDER_STATUS_CHANGED. O evento traz só o suficiente para o dashboard recarregar o pedido — nunca o código de entrega. O EventSource do navegador não envia cabeçalhos, então o dashboard precisa de um cliente SSE sobre fetch para mandar o Authorization.',
        params: restaurantScopeParamsSchema,
        response: { 200: orderStreamEventSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request, reply) => {
      // Com hijack o Fastify sai do caminho e nada aqui é serializado por ele: o schema da
      // resposta acima descreve o corpo de cada evento no OpenAPI, não o que é escrito no socket.
      reply.hijack()
      // Com hijack, os cabeçalhos que o cors e o helmet puseram na reply não vão para o socket.
      // Sem repassá-los, o navegador bloqueia o stream vindo de outra origem.
      for (const [name, value] of Object.entries(reply.getHeaders())) {
        if (value !== undefined) {
          reply.raw.setHeader(name, value)
        }
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      })

      const send = (chunk: string): void => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(chunk)
        }
      }

      send(`retry: ${RECONNECT_DELAY_MS}\n\n`)

      const unsubscribe = orderStream.subscribe(request.params.restaurantId, (event) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
      })

      // Proxies e balanceadores fecham conexão ociosa; o comentário periódico a mantém viva.
      const heartbeat = setInterval(() => send(': ping\n\n'), HEARTBEAT_INTERVAL_MS)

      const close = (): void => {
        clearInterval(heartbeat)
        unsubscribe()
      }

      request.raw.on('close', close)
      reply.raw.on('error', close)
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
