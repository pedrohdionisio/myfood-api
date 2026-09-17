import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/domain/enums.js'

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

export interface IOrdersRepository {
  findByIdempotencyKey(key: string, customerId: string): Promise<IOrder | null>

  create(data: ICreateOrderData): Promise<IOrder>
}
