import { z } from 'zod'

export const restaurantScopeParamsSchema = z.object({
  restaurantId: z.uuid()
})

export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string()
})
