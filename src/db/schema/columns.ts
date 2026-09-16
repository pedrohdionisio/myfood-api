import { timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from '@/shared/uuid.js'

export const primaryId = () => uuid().primaryKey().$defaultFn(uuidv7)

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
}
