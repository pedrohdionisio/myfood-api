import { z } from 'zod'
import type {
  ICustomerOrderSummary,
  IOrder,
  IRestaurantOrder
} from '@/application/interfaces/IOrdersRepository.js'
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/domain/enums.js'
import { buildImageUrls } from '@/domain/images.js'
import { imageUrlsSchema } from './uploads.js'

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

export const customerOrderResponseSchema = z.object({
  ...orderFields,
  deliveryCode: z.string()
})

export function toCustomerOrderResponse(
  order: IOrder
): z.infer<typeof customerOrderResponseSchema> {
  return order
}

export const orderScopeParamsSchema = z.object({
  orderId: z.uuid()
})

export const restaurantOrderScopeParamsSchema = z.object({
  restaurantId: z.uuid(),
  orderId: z.uuid()
})

export const orderPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20)
})

export const restaurantOrderPageQuerySchema = orderPageQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional()
})

export const reasonBodySchema = z.object({
  reason: z.string().trim().min(3).max(280).optional()
})

export const dispatchOrderBodySchema = z.object({
  driverMemberId: z.uuid()
})

export const customerOrderSummaryResponseSchema = z.object({
  id: z.uuid(),
  displayNumber: z.int(),
  status: z.enum(ORDER_STATUSES),
  totalCents: z.int(),
  createdAt: z.iso.datetime(),
  itemCount: z.int(),
  hasReview: z.boolean(),
  restaurant: z.object({
    id: z.uuid(),
    slug: z.string(),
    tradeName: z.string(),
    logoUrls: imageUrlsSchema.nullable()
  })
})

export const customerOrdersResponseSchema = z.object({
  items: z.array(customerOrderSummaryResponseSchema),
  page: z.int(),
  perPage: z.int(),
  hasMore: z.boolean()
})

export const restaurantOrderResponseSchema = z.object({
  ...orderFields,
  customerId: z.uuid(),
  driverMemberId: z.uuid().nullable(),
  customer: z.object({
    name: z.string(),
    phone: z.string().nullable()
  })
})

export const restaurantOrdersResponseSchema = z.object({
  items: z.array(restaurantOrderResponseSchema),
  page: z.int(),
  perPage: z.int(),
  hasMore: z.boolean()
})

export function toCustomerOrderSummaryResponse(
  summary: ICustomerOrderSummary,
  mediaBaseUrl: string
): z.infer<typeof customerOrderSummaryResponseSchema> {
  return {
    id: summary.id,
    displayNumber: summary.displayNumber,
    status: summary.status,
    totalCents: summary.totalCents,
    createdAt: summary.createdAt,
    itemCount: summary.itemCount,
    hasReview: summary.hasReview,
    restaurant: {
      id: summary.restaurantId,
      slug: summary.restaurantSlug,
      tradeName: summary.restaurantTradeName,
      logoUrls: summary.restaurantLogoKey
        ? buildImageUrls(mediaBaseUrl, summary.restaurantLogoKey)
        : null
    }
  }
}

export function toRestaurantOrderResponse(
  order: IRestaurantOrder
): z.infer<typeof restaurantOrderResponseSchema> {
  return {
    ...order,
    customer: { name: order.customerName, phone: order.customerPhone }
  }
}
