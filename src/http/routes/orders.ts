import type { DependencyContainer } from 'tsyringe'
import type { CancelOrderUseCase } from '@/application/useCases/orders/CancelOrderUseCase.js'
import type { CreateOrderUseCase } from '@/application/useCases/orders/CreateOrderUseCase.js'
import type { GetCustomerOrderUseCase } from '@/application/useCases/orders/GetCustomerOrderUseCase.js'
import type { ListCustomerOrdersUseCase } from '@/application/useCases/orders/ListCustomerOrdersUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import {
  createOrderBodySchema,
  customerOrderResponseSchema,
  customerOrdersResponseSchema,
  idempotencyHeaderSchema,
  orderPageQuerySchema,
  orderScopeParamsSchema,
  reasonBodySchema,
  toCustomerOrderResponse,
  toCustomerOrderSummaryResponse
} from '@/schemas/orders.js'
import type { App } from '../app.js'
import { requireCustomer } from '../plugins/auth.js'

export function registerOrderRoutes(app: App, container: DependencyContainer): void {
  const createOrder = container.resolve<CreateOrderUseCase>(TOKENS.CreateOrderUseCase)
  const listOrders = container.resolve<ListCustomerOrdersUseCase>(TOKENS.ListCustomerOrdersUseCase)
  const getOrder = container.resolve<GetCustomerOrderUseCase>(TOKENS.GetCustomerOrderUseCase)
  const cancelOrder = container.resolve<CancelOrderUseCase>(TOKENS.CancelOrderUseCase)
  const mediaBaseUrl = container.resolve<string>(TOKENS.MediaBaseUrl)

  app.post(
    '/orders',
    {
      schema: {
        tags: ['orders'],
        summary: 'Checkout: recalcula tudo pelo banco e cria o pedido em PENDING',
        headers: idempotencyHeaderSchema,
        body: createOrderBodySchema,
        response: { 201: customerOrderResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request, reply) => {
      const order = await createOrder.execute({
        idempotencyKey: request.headers['idempotency-key'],
        customerId: requireCustomer(request).id,
        ...request.body
      })

      return reply.status(201).send(toCustomerOrderResponse(order))
    }
  )

  app.get(
    '/orders',
    {
      schema: {
        tags: ['orders'],
        summary: 'Pedidos do cliente, mais recentes primeiro',
        querystring: orderPageQuerySchema,
        response: { 200: customerOrdersResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => {
      const result = await listOrders.execute({
        customerId: requireCustomer(request).id,
        ...request.query
      })

      return {
        ...result,
        items: result.items.map((item) => toCustomerOrderSummaryResponse(item, mediaBaseUrl))
      }
    }
  )

  app.get(
    '/orders/:orderId',
    {
      schema: {
        tags: ['orders'],
        summary: 'Pedido do cliente, com o código de entrega',
        params: orderScopeParamsSchema,
        response: { 200: customerOrderResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) =>
      toCustomerOrderResponse(
        await getOrder.execute(requireCustomer(request).id, request.params.orderId)
      )
  )

  app.post(
    '/orders/:orderId/cancel',
    {
      schema: {
        tags: ['orders'],
        summary: 'Cliente cancela o pedido, permitido só em PENDING',
        params: orderScopeParamsSchema,
        body: reasonBodySchema,
        response: { 200: customerOrderResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) =>
      toCustomerOrderResponse(
        await cancelOrder.execute({
          customerId: requireCustomer(request).id,
          orderId: request.params.orderId,
          reason: request.body.reason
        })
      )
  )
}
