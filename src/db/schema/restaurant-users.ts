import { boolean, index, pgTable, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { primaryId, timestamps } from './columns.js'
import { memberRole } from './enums.js'
import { restaurants } from './restaurants.js'

export const restaurantUsers = pgTable('restaurant_users', {
  id: primaryId(),
  cognitoSub: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 120 }).notNull(),
  email: varchar({ length: 254 }).notNull().unique(),
  phone: varchar({ length: 20 }),
  ...timestamps
})

export const restaurantMembers = pgTable(
  'restaurant_members',
  {
    id: primaryId(),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id),
    userId: uuid()
      .notNull()
      .references(() => restaurantUsers.id),
    role: memberRole().notNull(),
    active: boolean().notNull().default(true),
    ...timestamps
  },
  (table) => [
    uniqueIndex().on(table.restaurantId, table.userId),
    index().on(table.userId),
    unique('restaurant_members_id_restaurant_id').on(table.id, table.restaurantId)
  ]
)
