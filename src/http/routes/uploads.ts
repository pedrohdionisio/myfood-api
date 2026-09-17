import type { DependencyContainer } from 'tsyringe'
import type { CreateImageUploadUseCase } from '@/application/useCases/uploads/CreateImageUploadUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import { createImageUploadBodySchema, imageUploadResponseSchema } from '@/schemas/uploads.js'
import type { App } from '../app.js'

export function registerUploadRoutes(app: App, container: DependencyContainer): void {
  const createImageUpload = container.resolve<CreateImageUploadUseCase>(
    TOKENS.CreateImageUploadUseCase
  )

  app.post(
    '/restaurants/:restaurantId/uploads/images',
    {
      schema: {
        tags: ['uploads'],
        summary: 'Assina um POST direto para o S3; o arquivo não passa pela API',
        params: restaurantScopeParamsSchema,
        body: createImageUploadBodySchema,
        response: { 201: imageUploadResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request, reply) => {
      const { restaurantId } = request.params

      return reply
        .status(201)
        .send(await createImageUpload.execute({ restaurantId, ...request.body }))
    }
  )
}
