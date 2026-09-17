import { z } from 'zod'
import type { IOrder } from '@/application/interfaces/IOrdersRepository.js'
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/domain/enums.js'

export const idempotencyHeaderSchema = z.object({
  'idempotency-key': z.uuid('Envie um UUID no header Idempotency-Key.')
})

export const createOrderBodySchema = z.object({
  restaurantId: z.uuid(),
  addressId: z.uuid(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  changeForCents: z.int().min(0).optional(),
  notes: z.string().trim().max(280).optional(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.int().min(1).max(99),
        notes: z.string().trim().max(280).optional()
      })
    )
    .min(1)
    .max(50)
    .refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      'Junte o mesmo produto em uma linha só, somando a quantidade.'
    )
})

const orderItemResponseSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  unitPriceCents: z.int(),
  quantity: z.int(),
  totalCents: z.int(),
  notes: z.string().nullable()
})

const orderFields = {
  id: z.uuid(),
  displayNumber: z.int(),
  restaurantId: z.uuid(),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  changeForCents: z.int().nullable(),
  subtotalCents: z.int(),
  deliveryFeeCents: z.int(),
  discountCents: z.int(),
  totalCents: z.int(),
  notes: z.string().nullable(),
  deliveryZipCode: z.string(),
  deliveryStreet: z.string(),
  deliveryNumber: z.string(),
  deliveryComplement: z.string().nullable(),
  deliveryNeighborhood: z.string(),
  deliveryCity: z.string(),
  deliveryState: z.string(),
  deliveryReference: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  confirmedAt: z.iso.datetime().nullable(),
  readyAt: z.iso.datetime().nullable(),
  dispatchedAt: z.iso.datetime().nullable(),
  deliveredAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  items: z.array(orderItemResponseSchema)
}

// REGRA 1: este é o único schema de resposta do código que declara deliveryCode, e ele só é usado
// nas rotas do cliente dono do pedido. O Fastify serializa apenas o que está declarado, então
// nenhuma rota de restaurante ou de entregador consegue vazar o campo por descuido.
export const customerOrderResponseSchema = z.object({
  ...orderFields,
  deliveryCode: z.string()
})

export function toCustomerOrderResponse(
  order: IOrder
): z.infer<typeof customerOrderResponseSchema> {
  return order
}
