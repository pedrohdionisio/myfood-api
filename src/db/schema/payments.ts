import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { primaryId, timestamps } from './columns.js'
import { paymentChargeStatus } from './enums.js'
import { orders } from './orders.js'

export const payments = pgTable(
  'payments',
  {
    id: primaryId(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    providerChargeId: varchar({ length: 64 }).notNull().unique(),
    status: paymentChargeStatus().notNull().default('PENDING'),
    amountCents: integer().notNull(),
    brCode: text().notNull(),
    platformFeeCents: integer(),
    receiptUrl: varchar({ length: 255 }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    paidAt: timestamp({ withTimezone: true }),
    refundedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.orderId),
    // Varre tanto as cobranças a expirar quanto as a estornar; as duas filtram por status.
    index().on(table.status, table.expiresAt),
    // Um pedido tem no máximo uma cobrança viva. Expirada ou cancelada, uma nova pode ser criada.
    uniqueIndex('payments_one_open_charge')
      .on(table.orderId)
      .where(sql`${table.status} = 'PENDING'`),
    check('payments_amount_positive', sql`${table.amountCents} > 0`)
  ]
)

/**
 * Dedupe e auditoria dos webhooks do gateway (regra 6). A linha é inserida na MESMA transação que
 * aplica o efeito, então a existência dela já significa "processado" — não há coluna de estado.
 */
export const paymentWebhookEvents = pgTable('payment_webhook_events', {
  eventId: varchar({ length: 128 }).primaryKey(),
  event: varchar({ length: 60 }).notNull(),
  providerChargeId: varchar({ length: 64 }),
  payload: jsonb().notNull(),
  receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
})
