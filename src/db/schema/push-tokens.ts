import { sql } from 'drizzle-orm'
import { check, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { primaryId } from './columns.js'
import { customers } from './customers.js'
import { devicePlatform } from './enums.js'
import { restaurantUsers } from './restaurant-users.js'

// O token é do aparelho, e o mesmo aparelho entra como cliente ou como entregador: por isso uma
// tabela só, com exatamente um dono, e não uma por pool.
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: primaryId(),
    customerId: uuid().references(() => customers.id),
    restaurantUserId: uuid().references(() => restaurantUsers.id),
    token: varchar({ length: 255 }).notNull().unique(),
    platform: devicePlatform().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index().on(table.customerId),
    index().on(table.restaurantUserId),
    check(
      'push_tokens_single_owner',
      sql`num_nonnulls(${table.customerId}, ${table.restaurantUserId}) = 1`
    )
  ]
)
