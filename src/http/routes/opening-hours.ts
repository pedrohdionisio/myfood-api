import type { DependencyContainer } from 'tsyringe'
import type { ListOpeningHoursUseCase } from '@/application/useCases/openingHours/ListOpeningHoursUseCase.js'
import type { ReplaceOpeningHoursUseCase } from '@/application/useCases/openingHours/ReplaceOpeningHoursUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  openingHoursResponseSchema,
  replaceOpeningHoursBodySchema
} from '@/schemas/opening-hours.js'
import type { App } from '../app.js'

export function registerOpeningHoursRoutes(app: App, container: DependencyContainer): void {
  const listOpeningHours = container.resolve<ListOpeningHoursUseCase>(
    TOKENS.ListOpeningHoursUseCase
  )
  const replaceOpeningHours = container.resolve<ReplaceOpeningHoursUseCase>(
    TOKENS.ReplaceOpeningHoursUseCase
  )

  app.get(
    '/restaurants/:restaurantId/opening-hours',
    {
      schema: {
        tags: ['opening-hours'],
        summary: 'Turnos de funcionamento do restaurante',
        params: restaurantScopeParamsSchema,
        response: { 200: openingHoursResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) => listOpeningHours.execute(request.params.restaurantId)
  )

  app.put(
    '/restaurants/:restaurantId/opening-hours',
    {
      schema: {
        tags: ['opening-hours'],
        summary: 'Dono substitui a grade inteira de horários',
        params: restaurantScopeParamsSchema,
        body: replaceOpeningHoursBodySchema,
        response: { 200: openingHoursResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) => replaceOpeningHours.execute(request.params.restaurantId, request.body.shifts)
  )
}
