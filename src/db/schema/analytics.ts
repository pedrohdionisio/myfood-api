import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { products } from './menu.js'
import { restaurants } from './restaurants.js'

export const restaurantDailyStats = pgTable(
  'restaurant_daily_stats',
  {
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    date: date().notNull(),
    ordersCount: integer().notNull().default(0),
    deliveredCount: integer().notNull().default(0),
    canceledCount: integer().notNull().default(0),
    grossRevenueCents: bigint({ mode: 'number' }).notNull().default(0),
    deliveryFeeRevenueCents: bigint({ mode: 'number' }).notNull().default(0),
    totalPrepSeconds: bigint({ mode: 'number' }).notNull().default(0),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    primaryKey({ columns: [table.restaurantId, table.date] }),
    check(
      'restaurant_daily_stats_non_negative',
      sql`
      ${table.ordersCount} >= 0 AND ${table.deliveredCount} >= 0 AND ${table.canceledCount} >= 0
      AND ${table.grossRevenueCents} >= 0 AND ${table.deliveryFeeRevenueCents} >= 0
      AND ${table.totalPrepSeconds} >= 0
    `
    )
  ]
)

export const productDailySales = pgTable(
  'product_daily_sales',
  {
    productId: uuid()
      .notNull()
      .references(() => products.id),
    date: date().notNull(),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    quantity: integer().notNull().default(0),
    revenueCents: bigint({ mode: 'number' }).notNull().default(0)
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.date] }),
    index().on(table.restaurantId, table.date),
    check(
      'product_daily_sales_non_negative',
      sql`${table.quantity} >= 0 AND ${table.revenueCents} >= 0`
    )
  ]
)

export const processedMessages = pgTable('processed_messages', {
  messageId: varchar({ length: 128 }).primaryKey(),
  consumer: varchar({ length: 60 }).notNull(),
  processedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
})
