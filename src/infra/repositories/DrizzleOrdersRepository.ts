import { and, asc, eq, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICreateOrderData,
  IOrder,
  IOrderItem,
  IOrdersRepository
} from '@/application/interfaces/IOrdersRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import {
  idempotencyKeys,
  orderItems,
  orderStatusHistory,
  orders,
  restaurantOrderCounters
} from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError } from '@/domain/errors.js'
import { uuidv7 } from '@/shared/uuid.js'

type Transaction = Parameters<Parameters<IDatabaseConnection['db']['transaction']>[0]>[0]

const ORDER_COLUMNS = {
  id: orders.id,
  displayNumber: orders.displayNumber,
  customerId: orders.customerId,
  restaurantId: orders.restaurantId,
  driverMemberId: orders.driverMemberId,
  status: orders.status,
  paymentMethod: orders.paymentMethod,
  paymentStatus: orders.paymentStatus,
  changeForCents: orders.changeForCents,
  subtotalCents: orders.subtotalCents,
  deliveryFeeCents: orders.deliveryFeeCents,
  discountCents: orders.discountCents,
  totalCents: orders.totalCents,
  deliveryCode: orders.deliveryCode,
  notes: orders.notes,
  deliveryZipCode: orders.deliveryZipCode,
  deliveryStreet: orders.deliveryStreet,
  deliveryNumber: orders.deliveryNumber,
  deliveryComplement: orders.deliveryComplement,
  deliveryNeighborhood: orders.deliveryNeighborhood,
  deliveryCity: orders.deliveryCity,
  deliveryState: orders.deliveryState,
  deliveryReference: orders.deliveryReference,
  cancellationReason: orders.cancellationReason,
  confirmedAt: orders.confirmedAt,
  readyAt: orders.readyAt,
  dispatchedAt: orders.dispatchedAt,
  deliveredAt: orders.deliveredAt,
  finishedAt: orders.finishedAt,
  createdAt: orders.createdAt
}

const ORDER_ITEM_COLUMNS = {
  id: orderItems.id,
  productId: orderItems.productId,
  productName: orderItems.productName,
  unitPriceCents: orderItems.unitPriceCents,
  quantity: orderItems.quantity,
  totalCents: orderItems.totalCents,
  notes: orderItems.notes
}

type IOrderRow = Omit<
  IOrder,
  'confirmedAt' | 'readyAt' | 'dispatchedAt' | 'deliveredAt' | 'finishedAt' | 'createdAt' | 'items'
> & {
  confirmedAt: Date | null
  readyAt: Date | null
  dispatchedAt: Date | null
  deliveredAt: Date | null
  finishedAt: Date | null
  createdAt: Date
}

function toOrder(row: IOrderRow, items: IOrderItem[]): IOrder {
  return {
    ...row,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    readyAt: row.readyAt?.toISOString() ?? null,
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    items
  }
}

@injectable()
export class DrizzleOrdersRepository implements IOrdersRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  private async loadItems(tx: Transaction, orderId: string): Promise<IOrderItem[]> {
    return tx
      .select(ORDER_ITEM_COLUMNS)
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.id))
  }

  async findByIdempotencyKey(key: string, customerId: string): Promise<IOrder | null> {
    const db = this.database.db

    const [claimed] = await db
      .select({ orderId: idempotencyKeys.orderId })
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.customerId, customerId)))
      .limit(1)

    if (!claimed?.orderId) {
      return null
    }

    const [row] = await db
      .select(ORDER_COLUMNS)
      .from(orders)
      .where(eq(orders.id, claimed.orderId))
      .limit(1)

    if (!row) {
      return null
    }

    const items = await db
      .select(ORDER_ITEM_COLUMNS)
      .from(orderItems)
      .where(eq(orderItems.orderId, row.id))
      .orderBy(asc(orderItems.id))

    return toOrder(row, items)
  }

  async create(data: ICreateOrderData): Promise<IOrder> {
    const { idempotencyKey, customerId, restaurantId, items, ...values } = data

    return this.database.db.transaction(async (tx) => {
      const claimed = await tx
        .insert(idempotencyKeys)
        .values({ key: idempotencyKey, customerId })
        .onConflictDoNothing()
        .returning({ key: idempotencyKeys.key })

      if (claimed.length === 0) {
        throw new ConflictError(
          `Idempotency-Key ${idempotencyKey} já está em uso.`,
          'Este pedido já está sendo processado.'
        )
      }

      // O contador serializa checkouts simultâneos deste restaurante e só dele. RETURNING enxerga
      // o valor novo, então o número deste pedido é next_number - 1.
      const [counter] = await tx
        .update(restaurantOrderCounters)
        .set({ nextNumber: sql`${restaurantOrderCounters.nextNumber} + 1` })
        .where(eq(restaurantOrderCounters.restaurantId, restaurantId))
        .returning({ displayNumber: sql<number>`${restaurantOrderCounters.nextNumber} - 1` })

      if (!counter) {
        throw new Error(`restaurant_order_counters sem linha para o restaurante ${restaurantId}`)
      }

      const orderId = uuidv7()

      const [created] = await tx
        .insert(orders)
        .values({
          ...values,
          id: orderId,
          customerId,
          restaurantId,
          displayNumber: counter.displayNumber,
          status: 'PENDING'
        })
        .returning(ORDER_COLUMNS)

      if (!created) {
        throw new Error('insert de order não retornou linha')
      }

      await tx.insert(orderItems).values(items.map((item) => ({ ...item, id: uuidv7(), orderId })))

      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: null,
        toStatus: 'PENDING',
        actorType: 'CUSTOMER',
        actorId: customerId
      })

      await tx
        .update(idempotencyKeys)
        .set({ orderId })
        .where(eq(idempotencyKeys.key, idempotencyKey))

      return toOrder(created, await this.loadItems(tx, orderId))
    })
  }
}
