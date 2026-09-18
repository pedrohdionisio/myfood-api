import type { IOutboxEvent } from './IEventPublisher.js'

export interface IDailyStat {
  date: string
  ordersCount: number
  deliveredCount: number
  canceledCount: number
  grossRevenueCents: number
  deliveryFeeRevenueCents: number
  totalPrepSeconds: number
}

export interface IProductSale {
  productId: string
  productName: string
  quantity: number
  revenueCents: number
}

export interface IAnalyticsRange {
  restaurantId: string
  from: string
  to: string
}

export interface IAnalyticsRepository {
  /** false quando a mensagem já tinha sido processada — o agregado fica intacto (regra 6). */
  applyOrderEvent(event: IOutboxEvent): Promise<boolean>

  listDailyStats(range: IAnalyticsRange): Promise<IDailyStat[]>

  listTopProducts(range: IAnalyticsRange, limit: number): Promise<IProductSale[]>
}
