import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault
} from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'
import type { DependencyContainer } from 'tsyringe'
import type { Env } from '@/config/env.js'
import { buildLoggerOptions } from '@/config/logger.js'
import { uuidv7 } from '@/shared/uuid.js'
import { registerErrorHandler } from './error-handler.js'
import { registerAuth } from './plugins/auth.js'
import { registerMembership } from './plugins/membership.js'
import { registerSwagger } from './plugins/swagger.js'
import { registerAnalyticsRoutes } from './routes/analytics.js'
import { registerCustomerAuthRoutes, registerRestaurantAuthRoutes } from './routes/auth.js'
import { registerCuisineRoutes } from './routes/cuisines.js'
import { registerCustomerAddressRoutes } from './routes/customer-addresses.js'
import { registerDeliveryRoutes } from './routes/deliveries.js'
import { registerDiscoveryRoutes } from './routes/discovery.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerMemberRoutes } from './routes/members.js'
import { registerMenuCategoryRoutes } from './routes/menu-categories.js'
import { registerOpeningHoursRoutes } from './routes/opening-hours.js'
import { registerOrderRoutes } from './routes/orders.js'
import { registerPaymentRoutes } from './routes/payments.js'
import { registerProductRoutes } from './routes/products.js'
import { registerPushTokenRoutes } from './routes/push-tokens.js'
import { registerRestaurantOrderRoutes } from './routes/restaurant-orders.js'
import { registerRestaurantReviewRoutes } from './routes/restaurant-reviews.js'
import { registerRestaurantRoutes } from './routes/restaurants.js'
import { registerUploadRoutes } from './routes/uploads.js'
import { registerWebhookRoutes } from './routes/webhooks.js'

export type App = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>

export async function buildApp(env: Env, container: DependencyContainer): Promise<App> {
  const app = Fastify({
    logger: buildLoggerOptions(env),
    genReqId: () => uuidv7()
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    exposedHeaders: ['x-request-id']
  })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

  await registerSwagger(app)
  registerErrorHandler(app)

  registerAuth(app, container)
  registerMembership(app, container)

  registerHealthRoutes(app, container)
  registerCustomerAuthRoutes(app, container)
  registerRestaurantAuthRoutes(app, container)
  registerCustomerAddressRoutes(app, container)
  registerMemberRoutes(app, container)
  registerRestaurantRoutes(app, container)
  registerDiscoveryRoutes(app, container)
  registerOpeningHoursRoutes(app, container)
  registerCuisineRoutes(app, container)
  registerMenuCategoryRoutes(app, container)
  registerProductRoutes(app, container)
  registerOrderRoutes(app, container)
  registerPaymentRoutes(app, container)
  registerRestaurantOrderRoutes(app, container)
  registerDeliveryRoutes(app, container)
  registerPushTokenRoutes(app, container)
  registerRestaurantReviewRoutes(app, container)
  registerAnalyticsRoutes(app, container)
  registerUploadRoutes(app, container)
  await registerWebhookRoutes(app, container)

  return app
}
