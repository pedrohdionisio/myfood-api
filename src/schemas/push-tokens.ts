import { z } from 'zod'
import { DEVICE_PLATFORMS } from '@/domain/enums.js'

// Formato emitido pelo Expo. Validar aqui evita gravar um token que só falharia no envio.
const pushTokenSchema = z
  .string()
  .regex(/^Expo(nent)?PushToken\[[^[\]]+\]$/, 'Token de push do Expo inválido.')
  .max(255)

export const registerPushTokenBodySchema = z.object({
  token: pushTokenSchema,
  platform: z.enum(DEVICE_PLATFORMS)
})

export const unregisterPushTokenBodySchema = z.object({
  token: pushTokenSchema
})

export const pushTokenResponseSchema = z.object({
  token: z.string(),
  platform: z.enum(DEVICE_PLATFORMS)
})

export const removedPushTokenResponseSchema = z.object({
  token: z.string()
})
