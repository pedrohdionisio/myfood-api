import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { primaryId, timestamps } from './columns.js'
import { restaurantStatus } from './enums.js'

export const restaurants = pgTable(
  'restaurants',
  {
    id: primaryId(),
    slug: varchar({ length: 80 }).notNull().unique(),
    legalName: varchar({ length: 160 }).notNull(),
    tradeName: varchar({ length: 120 }).notNull(),
    cnpj: char({ length: 14 }).notNull().unique(),
    phone: varchar({ length: 20 }),
    email: varchar({ length: 254 }),
    description: text(),
    logoKey: varchar({ length: 255 }),
    bannerKey: varchar({ length: 255 }),

    zipCode: char({ length: 8 }).notNull(),
    street: varchar({ length: 160 }).notNull(),
    number: varchar({ length: 20 }).notNull(),
    complement: varchar({ length: 80 }),
    neighborhood: varchar({ length: 80 }).notNull(),
    city: varchar({ length: 80 }).notNull(),
    state: char({ length: 2 }).notNull(),

    deliveryFeeCents: integer().notNull().default(0),
    minOrderCents: integer().notNull().default(0),
    avgPrepTimeMin: smallint().notNull().default(30),

    status: restaurantStatus().notNull().default('DRAFT'),
    isAcceptingOrders: boolean().notNull().default(false),

    ratingAvg: numeric({ precision: 3, scale: 2, mode: 'number' }).notNull().default(0),
    ratingCount: integer().notNull().default(0),

    ...timestamps
  },
  (table) => [
    index().on(table.status),
    index().on(table.city, table.status),
    check('restaurants_delivery_fee_non_negative', sql`${table.deliveryFeeCents} >= 0`),
    check('restaurants_min_order_non_negative', sql`${table.minOrderCents} >= 0`),
    check('restaurants_rating_avg_range', sql`${table.ratingAvg} BETWEEN 0 AND 5`),
    check('restaurants_rating_count_non_negative', sql`${table.ratingCount} >= 0`)
  ]
)

export const cuisineCategories = pgTable('cuisine_categories', {
  id: primaryId(),
  name: varchar({ length: 60 }).notNull(),
  slug: varchar({ length: 60 }).notNull().unique(),
  iconKey: varchar({ length: 255 }),
  position: smallint().notNull().default(0)
})

export const restaurantCuisines = pgTable(
  'restaurant_cuisines',
  {
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    cuisineCategoryId: uuid()
      .notNull()
      .references(() => cuisineCategories.id)
  },
  (table) => [
    primaryKey({ columns: [table.restaurantId, table.cuisineCategoryId] }),
    index().on(table.cuisineCategoryId)
  ]
)

export const openingHours = pgTable(
  'opening_hours',
  {
    id: primaryId(),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    dayOfWeek: smallint().notNull(),
    opensAt: time().notNull(),
    closesAt: time().notNull()
  },
  (table) => [
    index().on(table.restaurantId, table.dayOfWeek),
    check('opening_hours_day_of_week_range', sql`${table.dayOfWeek} BETWEEN 0 AND 6`)
  ]
)

export const restaurantOrderCounters = pgTable(
  'restaurant_order_counters',
  {
    restaurantId: uuid()
      .primaryKey()
      .references(() => restaurants.id),
    nextNumber: integer().notNull().default(1)
  },
  (table) => [check('restaurant_order_counters_positive', sql`${table.nextNumber} >= 1`)]
)
