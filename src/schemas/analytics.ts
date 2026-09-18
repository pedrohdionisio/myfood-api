import { z } from 'zod'

const isoDate = z.iso.date()

export const analyticsQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((range) => range.from <= range.to, 'O início do período não pode ser depois do fim.')

export const analyticsResponseSchema = z.object({
  from: isoDate,
  to: isoDate,
  totals: z.object({
    ordersCount: z.int(),
    deliveredCount: z.int(),
    canceledCount: z.int(),
    grossRevenueCents: z.int(),
    deliveryFeeRevenueCents: z.int(),
    avgTicketCents: z.int(),
    avgPrepSeconds: z.int()
  }),
  daily: z.array(
    z.object({
      date: isoDate,
      ordersCount: z.int(),
      deliveredCount: z.int(),
      canceledCount: z.int(),
      grossRevenueCents: z.int(),
      deliveryFeeRevenueCents: z.int(),
      totalPrepSeconds: z.int()
    })
  ),
  topProducts: z.array(
    z.object({
      productId: z.uuid(),
      productName: z.string(),
      quantity: z.int(),
      revenueCents: z.int()
    })
  )
})
