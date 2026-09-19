import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { DependencyContainer } from 'tsyringe'
import type { ProcessPaymentWebhookUseCase } from '@/application/useCases/payments/ProcessPaymentWebhookUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { UnauthorizedError } from '@/domain/errors.js'
import {
  isValidWebhookSecret,
  isValidWebhookSignature
} from '@/infra/gateways/abacatepay-webhook.js'
import {
  paymentWebhookBodySchema,
  webhookAckSchema,
  webhookQuerySchema
} from '@/schemas/payments.js'
import type { App } from '../app.js'

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string
  }
}

export async function registerWebhookRoutes(
  app: App,
  container: DependencyContainer
): Promise<void> {
  const processWebhook = container.resolve<ProcessPaymentWebhookUseCase>(
    TOKENS.ProcessPaymentWebhookUseCase
  )
  const webhookSecret = container.resolve<string>(TOKENS.PaymentWebhookSecret)

  await app.register(async (scope) => {
    // A assinatura é sobre os bytes que chegaram. Reserializar o objeto já parseado mudaria
    // espaços e ordem de chaves, e o HMAC não bateria. O parser fica preso a este escopo.
    scope.addContentTypeParser<string>(
      'application/json',
      { parseAs: 'string' },
      (request, body, done) => {
        request.rawBody = body

        try {
          done(null, JSON.parse(body))
        } catch (error) {
          done(error as Error, undefined)
        }
      }
    )

    scope.withTypeProvider<ZodTypeProvider>().post(
      '/webhooks/abacatepay',
      {
        schema: {
          tags: ['webhooks'],
          summary: 'Confirmação de pagamento e estorno vindos da AbacatePay',
          querystring: webhookQuerySchema,
          body: paymentWebhookBodySchema,
          response: { 200: webhookAckSchema }
        },
        // Retentativa do gateway chega em rajada; o limite global recusaria justamente as
        // entregas que precisamos aceitar.
        config: { rateLimit: false }
      },
      async (request) => {
        if (!isValidWebhookSecret(webhookSecret, request.query.webhookSecret)) {
          throw new UnauthorizedError('Webhook sem o secret combinado.')
        }

        if (
          !isValidWebhookSignature(
            request.rawBody ?? '',
            request.headers['x-webhook-signature'] as string | undefined
          )
        ) {
          throw new UnauthorizedError('Assinatura do webhook não confere.')
        }

        // Um erro daqui para baixo vira 500 de propósito: é assim que o gateway reenvia.
        const outcome = await processWebhook.execute(request.body)

        request.log.info(
          { event: request.body.event, chargeId: request.body.data.transparent.id, outcome },
          'webhook de pagamento'
        )

        return { received: true as const }
      }
    )
  })
}
