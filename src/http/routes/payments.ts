import type { DependencyContainer } from 'tsyringe'
import type { CreatePixPaymentUseCase } from '@/application/useCases/payments/CreatePixPaymentUseCase.js'
import type { GetOrderPaymentUseCase } from '@/application/useCases/payments/GetOrderPaymentUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { orderScopeParamsSchema } from '@/schemas/orders.js'
import { paymentResponseSchema, toPaymentResponse } from '@/schemas/payments.js'
import type { App } from '../app.js'
import { requireCustomer } from '../plugins/auth.js'

export function registerPaymentRoutes(app: App, container: DependencyContainer): void {
  const createPayment = container.resolve<CreatePixPaymentUseCase>(TOKENS.CreatePixPaymentUseCase)
  const getPayment = container.resolve<GetOrderPaymentUseCase>(TOKENS.GetOrderPaymentUseCase)

  app.post(
    '/orders/:orderId/payment',
    {
      schema: {
        tags: ['payments'],
        summary: 'Gera o Pix do pedido, ou devolve o que ainda está válido',
        params: orderScopeParamsSchema,
        response: { 201: paymentResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request, reply) => {
      const payment = await createPayment.execute(
        requireCustomer(request).id,
        request.params.orderId
      )

      return reply.status(201).send(toPaymentResponse(payment))
    }
  )

  app.get(
    '/orders/:orderId/payment',
    {
      schema: {
        tags: ['payments'],
        summary: 'Estado da cobrança do pedido',
        params: orderScopeParamsSchema,
        response: { 200: paymentResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) =>
      toPaymentResponse(
        await getPayment.execute(requireCustomer(request).id, request.params.orderId)
      )
  )
}
