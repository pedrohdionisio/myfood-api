import { and, between, desc, eq, sql, sum } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  IAnalyticsRange,
  IAnalyticsRepository,
  IDailyStat,
  IProductSale
} from '@/application/interfaces/IAnalyticsRepository.js'
import type { IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import type { IDatabaseConnection, Transaction } from '@/db/client.js'
import {
  orderItems,
  orders,
  processedMessages,
  productDailySales,
  products,
  restaurantDailyStats
} from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { toBusinessDate } from '@/domain/time.js'

const CONSUMER = 'order-events'

interface IStatIncrement {
  ordersCount?: number
  deliveredCount?: number
  canceledCount?: number
  grossRevenueCents?: number
  deliveryFeeRevenueCents?: number
  totalPrepSeconds?: number
}

@injectable()
export class DrizzleAnalyticsRepository implements IAnalyticsRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  private async bumpDailyStats(
    tx: Transaction,
    restaurantId: string,
    date: string,
    increment: IStatIncrement
  ): Promise<void> {
    const columns = {
      ordersCount: restaurantDailyStats.ordersCount,
      deliveredCount: restaurantDailyStats.deliveredCount,
      canceledCount: restaurantDailyStats.canceledCount,
      grossRevenueCents: restaurantDailyStats.grossRevenueCents,
      deliveryFeeRevenueCents: restaurantDailyStats.deliveryFeeRevenueCents,
      totalPrepSeconds: restaurantDailyStats.totalPrepSeconds
    } as const

    const entries = Object.entries(increment).filter(([, value]) => value)

    await tx
      .insert(restaurantDailyStats)
      .values({ restaurantId, date, ...increment })
      .onConflictDoUpdate({
        target: [restaurantDailyStats.restaurantId, restaurantDailyStats.date],
        set: Object.fromEntries(
          entries.map(([key, value]) => [
            key,
            sql`${columns[key as keyof typeof columns]} + ${value}`
          ])
        )
      })
  }

  async applyOrderEvent(event: IOutboxEvent): Promise<boolean> {
    return this.database.db.transaction(async (tx) => {
      // A chave é o id do evento no outbox, não o MessageId do SQS: uma republicação da mesma
      // linha geraria outro MessageId e o agregado contaria duas vezes.
      const claimed = await tx
        .insert(processedMessages)
        .values({ messageId: event.id, consumer: CONSUMER })
        .onConflictDoNothing()
        .returning({ messageId: processedMessages.messageId })

      if (claimed.length === 0) {
        return false
      }

      const [order] = await tx
        .select({
          restaurantId: orders.restaurantId,
          createdAt: orders.createdAt,
          totalCents: orders.totalCents,
          deliveryFeeCents: orders.deliveryFeeCents,
          confirmedAt: orders.confirmedAt,
          readyAt: orders.readyAt
        })
        .from(orders)
        .where(eq(orders.id, event.orderId))
        .limit(1)

      if (!order) {
        throw new Error(`evento ${event.id} aponta para o pedido inexistente ${event.orderId}`)
      }

      // O dia é sempre o da CRIAÇÃO do pedido, e não o da entrega: senão um pedido feito às 23h
      // e entregue à meia-noite e meia apareceria criado num dia e faturado no outro.
      const date = toBusinessDate(order.createdAt)

      if (event.type === 'ORDER_CREATED') {
        await this.bumpDailyStats(tx, order.restaurantId, date, { ordersCount: 1 })

        return true
      }

      if (event.type === 'ORDER_CANCELED') {
        await this.bumpDailyStats(tx, order.restaurantId, date, { canceledCount: 1 })

        return true
      }

      const prepSeconds =
        order.confirmedAt && order.readyAt
          ? Math.max(0, Math.round((order.readyAt.getTime() - order.confirmedAt.getTime()) / 1000))
          : 0

      await this.bumpDailyStats(tx, order.restaurantId, date, {
        deliveredCount: 1,
        grossRevenueCents: order.totalCents,
        deliveryFeeRevenueCents: order.deliveryFeeCents,
        totalPrepSeconds: prepSeconds
      })

      const items = await tx
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          totalCents: orderItems.totalCents
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, event.orderId))

      for (const item of items) {
        await tx
          .insert(productDailySales)
          .values({
            productId: item.productId,
            date,
            restaurantId: order.restaurantId,
            quantity: item.quantity,
            revenueCents: item.totalCents
          })
          .onConflictDoUpdate({
            target: [productDailySales.productId, productDailySales.date],
            set: {
              quantity: sql`${productDailySales.quantity} + ${item.quantity}`,
              revenueCents: sql`${productDailySales.revenueCents} + ${item.totalCents}`
            }
          })
      }

      return true
    })
  }

  async listDailyStats(range: IAnalyticsRange): Promise<IDailyStat[]> {
    return this.database.db
      .select({
        date: restaurantDailyStats.date,
        ordersCount: restaurantDailyStats.ordersCount,
        deliveredCount: restaurantDailyStats.deliveredCount,
        canceledCount: restaurantDailyStats.canceledCount,
        grossRevenueCents: restaurantDailyStats.grossRevenueCents,
        deliveryFeeRevenueCents: restaurantDailyStats.deliveryFeeRevenueCents,
        totalPrepSeconds: restaurantDailyStats.totalPrepSeconds
      })
      .from(restaurantDailyStats)
      .where(
        and(
          eq(restaurantDailyStats.restaurantId, range.restaurantId),
          between(restaurantDailyStats.date, range.from, range.to)
        )
      )
      .orderBy(restaurantDailyStats.date)
  }

  async listTopProducts(range: IAnalyticsRange, limit: number): Promise<IProductSale[]> {
    const quantity = sum(productDailySales.quantity).mapWith(Number)
    const revenue = sum(productDailySales.revenueCents).mapWith(Number)

    return this.database.db
      .select({
        productId: productDailySales.productId,
        productName: products.name,
        quantity,
        revenueCents: revenue
      })
      .from(productDailySales)
      .innerJoin(products, eq(products.id, productDailySales.productId))
      .where(
        and(
          eq(productDailySales.restaurantId, range.restaurantId),
          between(productDailySales.date, range.from, range.to)
        )
      )
      .groupBy(productDailySales.productId, products.name)
      .orderBy(desc(revenue))
      .limit(limit)
  }
}
