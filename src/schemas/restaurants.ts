import { z } from 'zod'
import type { IRestaurant } from '@/application/interfaces/IRestaurantsRepository.js'
import { isValidCnpj } from '@/domain/cnpj.js'
import { RESTAURANT_STATUSES } from '@/domain/enums.js'
import { buildImageUrls } from '@/domain/images.js'
import { imageUrlsSchema } from './uploads.js'

const editableFields = {
  legalName: z.string().min(2).max(160),
  tradeName: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  email: z.email().max(254),
  description: z.string().max(2000),
  zipCode: z.string().regex(/^\d{8}$/, 'Informe o CEP com 8 dígitos, sem máscara.'),
  street: z.string().min(2).max(160),
  number: z.string().min(1).max(20),
  complement: z.string().max(80),
  neighborhood: z.string().min(2).max(80),
  city: z.string().min(2).max(80),
  state: z.string().regex(/^[A-Z]{2}$/, 'Informe a UF com 2 letras maiúsculas.'),
  deliveryFeeCents: z.int().min(0),
  minOrderCents: z.int().min(0),
  avgPrepTimeMin: z.int().min(1).max(240)
}

export const createRestaurantBodySchema = z.object({
  ...editableFields,
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'Informe o CNPJ com 14 dígitos, sem máscara.')
    .refine(isValidCnpj, 'CNPJ inválido.'),
  phone: editableFields.phone.optional(),
  email: editableFields.email.optional(),
  description: editableFields.description.optional(),
  complement: editableFields.complement.optional(),
  deliveryFeeCents: editableFields.deliveryFeeCents.optional(),
  minOrderCents: editableFields.minOrderCents.optional(),
  avgPrepTimeMin: editableFields.avgPrepTimeMin.optional()
})

export const updateRestaurantBodySchema = z
  .object({
    ...editableFields,
    logoKey: z.string().max(255).nullable(),
    bannerKey: z.string().max(255).nullable()
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Envie ao menos um campo para atualizar.')

export const restaurantResponseSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  legalName: z.string(),
  tradeName: z.string(),
  cnpj: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  description: z.string().nullable(),
  logoKey: z.string().nullable(),
  bannerKey: z.string().nullable(),
  logoUrls: imageUrlsSchema.nullable(),
  bannerUrls: imageUrlsSchema.nullable(),
  zipCode: z.string(),
  street: z.string(),
  number: z.string(),
  complement: z.string().nullable(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  deliveryFeeCents: z.int(),
  minOrderCents: z.int(),
  avgPrepTimeMin: z.int(),
  status: z.enum(RESTAURANT_STATUSES),
  isAcceptingOrders: z.boolean(),
  ratingAvg: z.number(),
  ratingCount: z.int()
})

export function toRestaurantResponse(
  restaurant: IRestaurant,
  mediaBaseUrl: string
): z.infer<typeof restaurantResponseSchema> {
  return {
    ...restaurant,
    logoUrls: restaurant.logoKey ? buildImageUrls(mediaBaseUrl, restaurant.logoKey) : null,
    bannerUrls: restaurant.bannerKey ? buildImageUrls(mediaBaseUrl, restaurant.bannerKey) : null
  }
}
