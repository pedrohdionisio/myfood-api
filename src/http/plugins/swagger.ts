import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'
import type { App } from '../app.js'

export async function registerSwagger(app: App): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MyFood API',
        description: 'Food delivery platform API',
        version: '0.1.0'
      },
      servers: []
    },
    transform: jsonSchemaTransform
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  })
}
