import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { primaryId, timestamps } from './columns.js'
import { customers } from './customers.js'
import { actorType, orderStatus, paymentMethod, paymentStatus } from './enums.js'
import { products } from './menu.js'
import { restaurantMembers } from './restaurant-users.js'
import { restaurants } from './restaurants.js'

export const orders = pgTable(
  'orders',
  {
    id: primaryId(),
    displayNumber: integer().notNull(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    driverMemberId: uuid(),

    status: orderStatus().notNull(),
    paymentMethod: paymentMethod().notNull(),
    paymentStatus: paymentStatus().notNull().default('PENDING'),
    changeForCents: integer(),

    subtotalCents: integer().notNull(),
    deliveryFeeCents: integer().notNull(),
    discountCents: integer().notNull().default(0),
    totalCents: integer().notNull(),

    deliveryCode: char({ length: 4 }).notNull(),
    notes: varchar({ length: 280 }),

    deliveryZipCode: char({ length: 8 }).notNull(),
    deliveryStreet: varchar({ length: 160 }).notNull(),
    deliveryNumber: varchar({ length: 20 }).notNull(),
    deliveryComplement: varchar({ length: 80 }),
    deliveryNeighborhood: varchar({ length: 80 }).notNull(),
    deliveryCity: varchar({ length: 80 }).notNull(),
    deliveryState: char({ length: 2 }).notNull(),
    deliveryReference: varchar({ length: 160 }),

    cancellationReason: varchar({ length: 280 }),

    confirmedAt: timestamp({ withTimezone: true }),
    readyAt: timestamp({ withTimezone: true }),
    dispatchedAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex().on(table.restaurantId, table.displayNumber),
    unique('orders_id_customer_id_restaurant_id').on(
      table.id,
      table.customerId,
      table.restaurantId
    ),
    index().on(table.restaurantId, table.status),
    index().on(table.restaurantId, table.createdAt),
    index().on(table.customerId, table.createdAt),
    index().on(table.driverMemberId, table.status),
    // FK composta: o entregador precisa ser membro do restaurante deste pedido.
    foreignKey({
      columns: [table.driverMemberId, table.restaurantId],
      foreignColumns: [restaurantMembers.id, restaurantMembers.restaurantId]
    }),
    check(
      'orders_total_matches_parts',
      sql`${table.totalCents} = ${table.subtotalCents} + ${table.deliveryFeeCents} - ${table.discountCents}`
    ),
    check('orders_subtotal_non_negative', sql`${table.subtotalCents} >= 0`),
    check('orders_delivery_fee_non_negative', sql`${table.deliveryFeeCents} >= 0`),
    check('orders_discount_non_negative', sql`${table.discountCents} >= 0`),
    check('orders_total_non_negative', sql`${table.totalCents} >= 0`),
    check('orders_delivery_code_format', sql`${table.deliveryCode} ~ '^[0-9]{4}$'`),
    check(
      'orders_change_only_for_cash',
      sql`${table.changeForCents} IS NULL OR ${table.paymentMethod} = 'CASH'`
    )
  ]
)

export const orderItems = pgTable(
  'order_items',
  {
    id: primaryId(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    productName: varchar({ length: 120 }).notNull(),
    unitPriceCents: integer().notNull(),
    quantity: smallint().notNull(),
    totalCents: integer().notNull(),
    notes: varchar({ length: 280 })
  },
  (table) => [
    index().on(table.orderId),
    index().on(table.productId),
    check('order_items_quantity_positive', sql`${table.quantity} > 0`),
    check('order_items_unit_price_non_negative', sql`${table.unitPriceCents} >= 0`),
    check(
      'order_items_total_matches_line',
      sql`${table.totalCents} = ${table.unitPriceCents} * ${table.quantity}`
    )
  ]
)

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: primaryId(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    fromStatus: orderStatus(),
    toStatus: orderStatus().notNull(),
    actorType: actorType().notNull(),
    actorId: uuid(),
    reason: varchar({ length: 280 }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index().on(table.orderId, table.createdAt)]
)

export const deliveryConfirmationAttempts = pgTable(
  'delivery_confirmation_attempts',
  {
    id: primaryId(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    memberId: uuid()
      .notNull()
      .references(() => restaurantMembers.id),
    success: boolean().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index().on(table.orderId, table.createdAt)]
)

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: varchar({ length: 64 }).primaryKey(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id),
    orderId: uuid().references(() => orders.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index().on(table.createdAt)]
)
