import type { ActorType, OrderStatus, PaymentMethod, PaymentStatus } from '@/domain/enums.js'
import type { OrderTimestampField } from '@/domain/order-status.js'

export interface IOrderItem {
  id: string
  productId: string
  productName: string
  unitPriceCents: number
  quantity: number
  totalCents: number
  notes: string | null
}

export interface IOrder {
  id: string
  displayNumber: number
  customerId: string
  restaurantId: string
  driverMemberId: string | null
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  changeForCents: number | null
  subtotalCents: number
  deliveryFeeCents: number
  discountCents: number
  totalCents: number
  deliveryCode: string
  notes: string | null
  deliveryZipCode: string
  deliveryStreet: string
  deliveryNumber: string
  deliveryComplement: string | null
  deliveryNeighborhood: string
  deliveryCity: string
  deliveryState: string
  deliveryReference: string | null
  cancellationReason: string | null
  confirmedAt: string | null
  readyAt: string | null
  dispatchedAt: string | null
  deliveredAt: string | null
  finishedAt: string | null
  createdAt: string
  items: IOrderItem[]
}

export interface ICreateOrderItemData {
  productId: string
  productName: string
  unitPriceCents: number
  quantity: number
  totalCents: number
  notes?: string | undefined
}

export interface ICreateOrderData {
  idempotencyKey: string
  customerId: string
  restaurantId: string
  paymentMethod: PaymentMethod
  changeForCents?: number | undefined
  subtotalCents: number
  deliveryFeeCents: number
  totalCents: number
  deliveryCode: string
  notes?: string | undefined
  deliveryZipCode: string
  deliveryStreet: string
  deliveryNumber: string
  deliveryComplement?: string | undefined
  deliveryNeighborhood: string
  deliveryCity: string
  deliveryState: string
  deliveryReference?: string | undefined
  items: ICreateOrderItemData[]
}

// O restaurante nunca recebe deliveryCode: a coluna não entra nem no SELECT, então o campo não
// existe no tipo que a rota do dashboard serializa (regra 1).
export type IRestaurantOrder = Omit<IOrder, 'deliveryCode'> & {
  customerName: string
  customerPhone: string | null
}

export interface ICustomerOrderSummary {
  id: string
  displayNumber: number
  status: OrderStatus
  totalCents: number
  createdAt: string
  itemCount: number
  restaurantId: string
  restaurantSlug: string
  restaurantTradeName: string
  restaurantLogoKey: string | null
}

export interface IOrderPageFilter {
  limit: number
  offset: number
}

export interface IRestaurantOrderPageFilter extends IOrderPageFilter {
  status?: OrderStatus | undefined
}

export interface IChangeOrderStatusData {
  orderId: string
  from: OrderStatus
  to: OrderStatus
  actorType: ActorType
  actorId: string
  reason?: string | undefined
  driverMemberId?: string | undefined
  timestampFields: readonly OrderTimestampField[]
}

export interface IOrdersRepository {
  findByIdempotencyKey(key: string, customerId: string): Promise<IOrder | null>

  create(data: ICreateOrderData): Promise<IOrder>

  findByIdForCustomer(customerId: string, orderId: string): Promise<IOrder | null>

  listByCustomer(customerId: string, filter: IOrderPageFilter): Promise<ICustomerOrderSummary[]>

  findByIdForRestaurant(restaurantId: string, orderId: string): Promise<IRestaurantOrder | null>

  listByRestaurant(
    restaurantId: string,
    filter: IRestaurantOrderPageFilter
  ): Promise<IRestaurantOrder[]>

  /** false quando o UPDATE condicional não casou: outro ator mudou o status nesse meio-tempo. */
  changeStatus(data: IChangeOrderStatusData): Promise<boolean>
}
