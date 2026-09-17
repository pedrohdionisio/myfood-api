import { z } from 'zod'
import { ORDER_STATUSES, PAYMENT_METHODS } from '@/domain/enums.js'

export const confirmDeliveryBodySchema = z.object({
  code: z.string().regex(/^\d{4}$/, 'O código de entrega tem 4 dígitos.')
})

// Sem deliveryCode: o entregador PEDE o código ao cliente, nunca o recebe da API (regra 1).
export const driverDeliveriesResponseSchema = z.array(
  z.object({
    id: z.uuid(),
    displayNumber: z.int(),
    status: z.enum(ORDER_STATUSES),
    restaurantId: z.uuid(),
    restaurantTradeName: z.string(),
    customerName: z.string(),
    customerPhone: z.string().nullable(),
    deliveryZipCode: z.string(),
    deliveryStreet: z.string(),
    deliveryNumber: z.string(),
    deliveryComplement: z.string().nullable(),
    deliveryNeighborhood: z.string(),
    deliveryCity: z.string(),
    deliveryState: z.string(),
    deliveryReference: z.string().nullable(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    totalCents: z.int().nullable(),
    changeForCents: z.int().nullable(),
    itemCount: z.int(),
    dispatchedAt: z.iso.datetime().nullable()
  })
)

export const deliveryOutcomeResponseSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(ORDER_STATUSES)
})
