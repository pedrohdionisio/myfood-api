import { z } from 'zod'

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:MM.')

const shiftSchema = z.object({
  dayOfWeek: z.int().min(0).max(6),
  opensAt: timeOfDay,
  closesAt: timeOfDay
})

export const replaceOpeningHoursBodySchema = z.object({
  shifts: z.array(shiftSchema).max(50)
})

export const openingHoursResponseSchema = z.array(shiftSchema.extend({ id: z.uuid() }))
