export const MEMBER_ROLES = ['OWNER', 'DRIVER'] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export const RESTAURANT_STATUSES = ['DRAFT', 'ACTIVE', 'SUSPENDED'] as const
export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number]

export const ORDER_STATUSES = [
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
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_METHODS = ['ONLINE', 'CASH', 'CARD_ON_DELIVERY'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

// Estado da cobrança no gateway, mais fino que o payment_status do pedido: REFUND_PENDING existe
// porque o estorno é pedido dentro da transação do cancelamento e executado depois, pelo worker.
export const PAYMENT_CHARGE_STATUSES = [
  'PENDING',
  'PAID',
  'EXPIRED',
  'CANCELED',
  'REFUND_PENDING',
  'REFUNDED',
  'FAILED'
] as const
export type PaymentChargeStatus = (typeof PAYMENT_CHARGE_STATUSES)[number]

export const ACTOR_TYPES = ['CUSTOMER', 'RESTAURANT_USER', 'SYSTEM'] as const
export type ActorType = (typeof ACTOR_TYPES)[number]

export const DEVICE_PLATFORMS = ['IOS', 'ANDROID'] as const
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number]

export const ORDER_EVENT_TYPES = ['ORDER_CREATED', 'ORDER_DELIVERED', 'ORDER_CANCELED'] as const
export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number]
