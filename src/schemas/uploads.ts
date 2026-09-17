import { z } from 'zod'
import { IMAGE_CONTENT_TYPES, IMAGE_KINDS } from '@/domain/images.js'

export const createImageUploadBodySchema = z.object({
  kind: z.enum(IMAGE_KINDS),
  contentType: z.enum(IMAGE_CONTENT_TYPES)
})

export const imageUploadResponseSchema = z.object({
  imageKey: z.string(),
  url: z.url(),
  fields: z.record(z.string(), z.string()),
  maxBytes: z.int(),
  expiresInSeconds: z.int()
})

export const imageUrlsSchema = z.object({
  sm: z.url(),
  md: z.url(),
  lg: z.url()
})
