import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { primaryId, timestamps } from './columns.js'
import { devicePlatform } from './enums.js'

export const customers = pgTable('customers', {
  id: primaryId(),
  cognitoSub: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 120 }).notNull(),
  email: varchar({ length: 254 }).notNull().unique(),
  phone: varchar({ length: 20 }),
  ...timestamps
})

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: primaryId(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id),
    label: varchar({ length: 40 }),
    zipCode: char({ length: 8 }).notNull(),
    street: varchar({ length: 160 }).notNull(),
    number: varchar({ length: 20 }).notNull(),
    complement: varchar({ length: 80 }),
    neighborhood: varchar({ length: 80 }).notNull(),
    city: varchar({ length: 80 }).notNull(),
    state: char({ length: 2 }).notNull(),
    reference: varchar({ length: 160 }),
    isDefault: boolean().notNull().default(false),
    ...timestamps
  },
  (table) => [
    index().on(table.customerId),
    uniqueIndex('customer_addresses_one_default')
      .on(table.customerId)
      .where(sql`${table.isDefault}`)
  ]
)

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: primaryId(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id),
    token: varchar({ length: 255 }).notNull().unique(),
    platform: devicePlatform().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index().on(table.customerId)]
)
