import { and, asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  IChangeOrderStatusData,
  IConfirmDeliveryData,
  ICreateOrderData,
  ICustomerOrderSummary,
  IDriverAssignment,
  IDriverDelivery,
  IOrder,
  IOrderItem,
  IOrderPageFilter,
  IOrdersRepository,
  IRestaurantOrder,
  IRestaurantOrderPageFilter
} from '@/application/interfaces/IOrdersRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import {
  customers,
  deliveryConfirmationAttempts,
  idempotencyKeys,
  orderItems,
  orderStatusHistory,
  orders,
  restaurantOrderCounters,
  restaurants
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

const { deliveryCode: _withheldDeliveryCode, ...ORDER_COLUMNS_WITHOUT_CODE } = ORDER_COLUMNS

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

function toTimestamps(row: {
  confirmedAt: Date | null
  readyAt: Date | null
  dispatchedAt: Date | null
  deliveredAt: Date | null
  finishedAt: Date | null
  createdAt: Date
}) {
  return {
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    readyAt: row.readyAt?.toISOString() ?? null,
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  }
}

function toOrder(row: IOrderRow, items: IOrderItem[]): IOrder {
  return { ...row, ...toTimestamps(row), items }
}

@injectable()
export class DrizzleOrdersRepository implements IOrdersRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  private async selectItems(orderId: string): Promise<IOrderItem[]> {
    return this.database.db
      .select(ORDER_ITEM_COLUMNS)
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.id))
  }

  private async selectItemsForOrders(orderIds: string[]): Promise<Map<string, IOrderItem[]>> {
    const grouped = new Map<string, IOrderItem[]>()

    if (orderIds.length === 0) {
      return grouped
    }

    const rows = await this.database.db
      .select({ ...ORDER_ITEM_COLUMNS, orderId: orderItems.orderId })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(asc(orderItems.id))

    for (const { orderId, ...item } of rows) {
      const list = grouped.get(orderId) ?? []

      list.push(item)
      grouped.set(orderId, list)
    }

    return grouped
  }

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

  async findByIdForCustomer(customerId: string, orderId: string): Promise<IOrder | null> {
    const [row] = await this.database.db
      .select(ORDER_COLUMNS)
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
      .limit(1)

    if (!row) {
      return null
    }

    return toOrder(row, await this.selectItems(orderId))
  }

  async listByCustomer(
    customerId: string,
    filter: IOrderPageFilter
  ): Promise<ICustomerOrderSummary[]> {
    const rows = await this.database.db
      .select({
        id: orders.id,
        displayNumber: orders.displayNumber,
        status: orders.status,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
        itemCount: sql<number>`(
          select count(*) from order_items oi where oi.order_id = ${orders.id}
        )`.mapWith(Number),
        hasReview: sql<boolean>`exists (
          select 1 from reviews r where r.order_id = ${orders.id}
        )`.mapWith(Boolean),
        restaurantId: restaurants.id,
        restaurantSlug: restaurants.slug,
        restaurantTradeName: restaurants.tradeName,
        restaurantLogoKey: restaurants.logoKey
      })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(filter.limit)
      .offset(filter.offset)

    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  }

  async findByIdForRestaurant(
    restaurantId: string,
    orderId: string
  ): Promise<IRestaurantOrder | null> {
    const [row] = await this.database.db
      .select({
        ...ORDER_COLUMNS_WITHOUT_CODE,
        customerName: customers.name,
        customerPhone: customers.phone
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId)))
      .limit(1)

    if (!row) {
      return null
    }

    return { ...row, ...toTimestamps(row), items: await this.selectItems(orderId) }
  }

  async listByRestaurant(
    restaurantId: string,
    filter: IRestaurantOrderPageFilter
  ): Promise<IRestaurantOrder[]> {
    const rows = await this.database.db
      .select({
        ...ORDER_COLUMNS_WITHOUT_CODE,
        customerName: customers.name,
        customerPhone: customers.phone
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          filter.status ? eq(orders.status, filter.status) : undefined
        )
      )
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(filter.limit)
      .offset(filter.offset)

    const items = await this.selectItemsForOrders(rows.map((row) => row.id))

    return rows.map((row) => ({
      ...row,
      ...toTimestamps(row),
      items: items.get(row.id) ?? []
    }))
  }

  // O status esperado entra no WHERE: entre a leitura que validou a transição e este UPDATE cabe
  // outro ator mudando o pedido, e zero linhas afetadas é exatamente esse caso.
  async changeStatus(data: IChangeOrderStatusData): Promise<boolean> {
    const { orderId, from, to, actorType, actorId, reason, driverMemberId, timestampFields } = data

    return this.database.db.transaction(async (tx) => {
      const now = new Date()
      const timestamps = Object.fromEntries(timestampFields.map((field) => [field, now]))

      const updated = await tx
        .update(orders)
        .set({
          status: to,
          ...timestamps,
          ...(driverMemberId ? { driverMemberId } : {}),
          ...(reason ? { cancellationReason: reason } : {})
        })
        .where(and(eq(orders.id, orderId), eq(orders.status, from)))
        .returning({ id: orders.id })

      if (updated.length === 0) {
        return false
      }

      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: from,
        toStatus: to,
        actorType,
        actorId,
        reason: reason ?? null
      })

      return true
    })
  }

  async listDeliveriesForMembers(memberIds: string[]): Promise<IDriverDelivery[]> {
    if (memberIds.length === 0) {
      return []
    }

    const rows = await this.database.db
      .select({
        id: orders.id,
        displayNumber: orders.displayNumber,
        status: orders.status,
        restaurantId: restaurants.id,
        restaurantTradeName: restaurants.tradeName,
        customerName: customers.name,
        customerPhone: customers.phone,
        deliveryZipCode: orders.deliveryZipCode,
        deliveryStreet: orders.deliveryStreet,
        deliveryNumber: orders.deliveryNumber,
        deliveryComplement: orders.deliveryComplement,
        deliveryNeighborhood: orders.deliveryNeighborhood,
        deliveryCity: orders.deliveryCity,
        deliveryState: orders.deliveryState,
        deliveryReference: orders.deliveryReference,
        paymentMethod: orders.paymentMethod,
        totalCents: orders.totalCents,
        changeForCents: orders.changeForCents,
        itemCount: sql<number>`(
          select count(*) from order_items oi where oi.order_id = ${orders.id}
        )`.mapWith(Number),
        dispatchedAt: orders.dispatchedAt
      })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(and(eq(orders.status, 'OUT_FOR_DELIVERY'), inArray(orders.driverMemberId, memberIds)))
      .orderBy(asc(orders.dispatchedAt), asc(orders.id))

    return rows.map((row) => ({
      ...row,
      dispatchedAt: row.dispatchedAt?.toISOString() ?? null
    }))
  }

  async findDriverAssignment(orderId: string): Promise<IDriverAssignment | null> {
    const [row] = await this.database.db
      .select({ status: orders.status, driverMemberId: orders.driverMemberId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    return row ?? null
  }

  async countRecentFailedConfirmations(orderId: string, since: Date): Promise<number> {
    const [row] = await this.database.db
      .select({ total: count() })
      .from(deliveryConfirmationAttempts)
      .where(
        and(
          eq(deliveryConfirmationAttempts.orderId, orderId),
          eq(deliveryConfirmationAttempts.success, false),
          gte(deliveryConfirmationAttempts.createdAt, since)
        )
      )

    return row?.total ?? 0
  }

  async confirmDelivery(data: IConfirmDeliveryData): Promise<boolean> {
    const { orderId, memberId, actorId, code } = data

    return this.database.db.transaction(async (tx) => {
      const now = new Date()

      // Id, status e código no mesmo WHERE: zero linhas é código errado OU status inválido, sem
      // distinguir os dois, e duas confirmações simultâneas deixam exatamente uma DELIVERED.
      const updated = await tx
        .update(orders)
        .set({ status: 'DELIVERED', deliveredAt: now, finishedAt: now })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.status, 'OUT_FOR_DELIVERY'),
            eq(orders.deliveryCode, code)
          )
        )
        .returning({ id: orders.id })

      const success = updated.length > 0

      await tx.insert(deliveryConfirmationAttempts).values({ orderId, memberId, success })

      if (success) {
        await tx.insert(orderStatusHistory).values({
          orderId,
          fromStatus: 'OUT_FOR_DELIVERY',
          toStatus: 'DELIVERED',
          actorType: 'RESTAURANT_USER',
          actorId
        })
      }

      return success
    })
  }
}
