import { pgEnum } from 'drizzle-orm/pg-core'

export const memberRole = pgEnum('member_role', ['OWNER', 'DRIVER'])

export const restaurantStatus = pgEnum('restaurant_status', ['DRAFT', 'ACTIVE', 'SUSPENDED'])

export const orderStatus = pgEnum('order_status', [
  'PENDING_PAYMENT',
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'REJECTED',
  'CANCELED'
])

export const paymentMethod = pgEnum('payment_method', ['ONLINE', 'CASH', 'CARD_ON_DELIVERY'])

export const paymentStatus = pgEnum('payment_status', ['PENDING', 'PAID', 'FAILED', 'REFUNDED'])

export const actorType = pgEnum('actor_type', ['CUSTOMER', 'RESTAURANT_USER', 'SYSTEM'])

export const devicePlatform = pgEnum('device_platform', ['IOS', 'ANDROID'])

export type MemberRole = (typeof memberRole.enumValues)[number]
export type RestaurantStatus = (typeof restaurantStatus.enumValues)[number]
export type OrderStatus = (typeof orderStatus.enumValues)[number]
export type PaymentMethod = (typeof paymentMethod.enumValues)[number]
export type PaymentStatus = (typeof paymentStatus.enumValues)[number]
export type ActorType = (typeof actorType.enumValues)[number]
export type DevicePlatform = (typeof devicePlatform.enumValues)[number]
