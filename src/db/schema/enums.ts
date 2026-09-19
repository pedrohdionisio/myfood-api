import { pgEnum } from 'drizzle-orm/pg-core'
import {
  ACTOR_TYPES,
  DEVICE_PLATFORMS,
  MEMBER_ROLES,
  ORDER_EVENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_CHARGE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  RESTAURANT_STATUSES
} from '@/domain/enums.js'

export const memberRole = pgEnum('member_role', MEMBER_ROLES)
export const restaurantStatus = pgEnum('restaurant_status', RESTAURANT_STATUSES)
export const orderStatus = pgEnum('order_status', ORDER_STATUSES)
export const paymentMethod = pgEnum('payment_method', PAYMENT_METHODS)
export const paymentStatus = pgEnum('payment_status', PAYMENT_STATUSES)
export const paymentChargeStatus = pgEnum('payment_charge_status', PAYMENT_CHARGE_STATUSES)
export const actorType = pgEnum('actor_type', ACTOR_TYPES)
export const devicePlatform = pgEnum('device_platform', DEVICE_PLATFORMS)

export const orderEventType = pgEnum('order_event_type', ORDER_EVENT_TYPES)
