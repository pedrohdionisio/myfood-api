import type { DependencyContainer } from 'tsyringe'
import type { CreateOrderUseCase } from '@/application/useCases/orders/CreateOrderUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import {
  createOrderBodySchema,
  customerOrderResponseSchema,
  idempotencyHeaderSchema,
  toCustomerOrderResponse
} from '@/schemas/orders.js'
import type { App } from '../app.js'
import { requireCustomer } from '../plugins/auth.js'

export function registerOrderRoutes(app: App, container: DependencyContainer): void {
  const createOrder = container.resolve<CreateOrderUseCase>(TOKENS.CreateOrderUseCase)

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
}
