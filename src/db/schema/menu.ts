import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { primaryId, timestamps } from './columns.js'
import { restaurants } from './restaurants.js'

export const menuCategories = pgTable(
  'menu_categories',
  {
    id: primaryId(),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    name: varchar({ length: 80 }).notNull(),
    position: smallint().notNull().default(0),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.restaurantId, table.position),
    unique('menu_categories_id_restaurant_id').on(table.id, table.restaurantId),
    // Parcial: arquivar "Bebidas" e criar outra com o mesmo nome continua valendo.
    uniqueIndex('menu_categories_unique_name')
      .on(table.restaurantId, sql`immutable_unaccent(lower(${table.name}))`)
      .where(sql`${table.archivedAt} is null`)
  ]
)

export const products = pgTable(
  'products',
  {
    id: primaryId(),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    menuCategoryId: uuid().notNull(),
    name: varchar({ length: 120 }).notNull(),
    description: text(),
    priceCents: integer().notNull(),
    imageKey: varchar({ length: 255 }),
    position: smallint().notNull().default(0),
    isAvailable: boolean().notNull().default(true),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.restaurantId, table.menuCategoryId, table.position),
    // FK composta: garante que o produto e sua categoria pertencem ao mesmo restaurante.
    // Sem ela, products.restaurant_id (denormalizado para autorização) poderia divergir.
    foreignKey({
      columns: [table.menuCategoryId, table.restaurantId],
      foreignColumns: [menuCategories.id, menuCategories.restaurantId]
    }),
    check('products_price_non_negative', sql`${table.priceCents} >= 0`),
    uniqueIndex('products_unique_name_per_category')
      .on(table.menuCategoryId, sql`immutable_unaccent(lower(${table.name}))`)
      .where(sql`${table.archivedAt} is null`)
  ]
)
