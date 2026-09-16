import { z } from 'zod'

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number()
})

export const readyResponseSchema = z.object({
  status: z.enum(['ready', 'unavailable']),
  database: z.enum(['up', 'down'])
})
