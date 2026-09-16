import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { primaryId, timestamps } from './columns.js'
import { customers } from './customers.js'
import { orders } from './orders.js'
import { restaurants } from './restaurants.js'

export const reviews = pgTable(
  'reviews',
  {
    id: primaryId(),
    orderId: uuid()
      .notNull()
      .unique()
      .references(() => orders.id),
    customerId: uuid()
      .notNull()
      .references(() => customers.id),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    rating: smallint().notNull(),
    comment: varchar({ length: 1000 }),
    reply: varchar({ length: 1000 }),
    repliedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.restaurantId, table.createdAt),
    // FK composta: a avaliação só pode existir para o cliente e o restaurante
    // que realmente estão no pedido.
    foreignKey({
      columns: [table.orderId, table.customerId, table.restaurantId],
      foreignColumns: [orders.id, orders.customerId, orders.restaurantId]
    }),
    check('reviews_rating_range', sql`${table.rating} BETWEEN 1 AND 5`)
  ]
)
