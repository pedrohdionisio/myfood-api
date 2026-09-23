import { and, asc, eq, inArray, lt, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type { IOrderNotificationTarget } from '@/application/interfaces/IOrdersRepository.js'
import type {
  IConfirmPaymentData,
  ICreatePaymentData,
  IPayment,
  IPaymentsRepository,
  IPendingCharge,
  IRecordRefundData
} from '@/application/interfaces/IPaymentsRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import {
  orderStatusHistory,
  orders,
  outboxEvents,
  payments,
  paymentWebhookEvents
} from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError } from '@/domain/errors.js'
import { uuidv7 } from '@/shared/uuid.js'
import { ORDER_NOTIFICATION_COLUMNS } from './order-notification-columns.js'
import { violatesUniqueConstraint } from './unique-violation.js'

const OPEN_CHARGE = 'payments_one_open_charge'

const PAYMENT_COLUMNS = {
  id: payments.id,
  orderId: payments.orderId,
  providerChargeId: payments.providerChargeId,
  status: payments.status,
  amountCents: payments.amountCents,
  brCode: payments.brCode,
  receiptUrl: payments.receiptUrl,
  expiresAt: payments.expiresAt,
  paidAt: payments.paidAt,
  refundedAt: payments.refundedAt,
  createdAt: payments.createdAt
}

const PENDING_CHARGE_COLUMNS = {
  id: payments.id,
  orderId: payments.orderId,
  providerChargeId: payments.providerChargeId,
  amountCents: payments.amountCents
}

type IPaymentRow = Omit<IPayment, 'expiresAt' | 'paidAt' | 'refundedAt' | 'createdAt'> & {
  expiresAt: Date
  paidAt: Date | null
  refundedAt: Date | null
  createdAt: Date
}

function toPayment(row: IPaymentRow): IPayment {
  return {
    ...row,
    expiresAt: row.expiresAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    refundedAt: row.refundedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  }
}

@injectable()
export class DrizzlePaymentsRepository implements IPaymentsRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async findOpenByOrder(orderId: string): Promise<IPayment | null> {
    const [row] = await this.database.db
      .select(PAYMENT_COLUMNS)
      .from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.status, 'PENDING')))
      .limit(1)

    return row ? toPayment(row) : null
  }

  async findLatestByOrder(orderId: string): Promise<IPayment | null> {
    const [row] = await this.database.db
      .select(PAYMENT_COLUMNS)
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(sql`${payments.createdAt} desc`)
      .limit(1)

    return row ? toPayment(row) : null
  }

  async create(data: ICreatePaymentData): Promise<IPayment> {
    try {
      const [created] = await this.database.db
        .insert(payments)
        .values({ ...data, id: uuidv7() })
        .returning(PAYMENT_COLUMNS)

      if (!created) {
        throw new Error('insert de payment não retornou linha')
      }

      return toPayment(created)
    } catch (error) {
      // Duas requisições simultâneas na mesma tela de pagamento. O índice parcial é quem decide.
      if (violatesUniqueConstraint(error, OPEN_CHARGE)) {
        throw new ConflictError(
          `Pedido ${data.orderId} já tem cobrança aberta.`,
          'Já existe um Pix aberto para este pedido. Recarregue a tela.'
        )
      }

      throw error
    }
  }

  async confirm(data: IConfirmPaymentData): Promise<IOrderNotificationTarget | null> {
    return this.database.db.transaction(async (tx) => {
      const claimed = await tx
        .insert(paymentWebhookEvents)
        .values({
          eventId: data.eventId,
          event: data.event,
          providerChargeId: data.providerChargeId,
          payload: data.payload
        })
        .onConflictDoNothing()
        .returning({ eventId: paymentWebhookEvents.eventId })

      if (claimed.length === 0) {
        return null
      }

      const [charge] = await tx
        .update(payments)
        .set({ status: 'PAID', paidAt: new Date(), receiptUrl: data.receiptUrl })
        .where(
          and(
            eq(payments.providerChargeId, data.providerChargeId),
            eq(payments.status, 'PENDING'),
            eq(payments.amountCents, data.paidAmountCents)
          )
        )
        .returning({ orderId: payments.orderId })

      if (!charge) {
        // O Pix foi pago depois que a varredura já expirou a cobrança e cancelou o pedido. O
        // dinheiro entrou e o pedido não vai acontecer: sem isto ele ficaria com a plataforma.
        await tx
          .update(payments)
          .set({ status: 'REFUND_PENDING', paidAt: new Date(), receiptUrl: data.receiptUrl })
          .where(
            and(
              eq(payments.providerChargeId, data.providerChargeId),
              inArray(payments.status, ['EXPIRED', 'CANCELED'])
            )
          )

        return null
      }

      const [updated] = await tx
        .update(orders)
        .set({ status: 'PENDING', paymentStatus: 'PAID' })
        .where(and(eq(orders.id, charge.orderId), eq(orders.status, 'PENDING_PAYMENT')))
        .returning(ORDER_NOTIFICATION_COLUMNS)

      if (!updated) {
        return null
      }

      await tx.insert(orderStatusHistory).values({
        orderId: charge.orderId,
        fromStatus: 'PENDING_PAYMENT',
        toStatus: 'PENDING',
        actorType: 'SYSTEM',
        actorId: null
      })

      // Só agora o pedido existe para o restaurante e para os agregados.
      await tx
        .insert(outboxEvents)
        .values({ id: uuidv7(), type: 'ORDER_CREATED', orderId: charge.orderId })

      return updated
    })
  }

  async recordRefund(data: IRecordRefundData): Promise<boolean> {
    return this.database.db.transaction(async (tx) => {
      const claimed = await tx
        .insert(paymentWebhookEvents)
        .values({
          eventId: data.eventId,
          event: data.event,
          providerChargeId: data.providerChargeId,
          payload: data.payload
        })
        .onConflictDoNothing()
        .returning({ eventId: paymentWebhookEvents.eventId })

      if (claimed.length === 0) {
        return false
      }

      const [charge] = await tx
        .update(payments)
        .set({ status: 'REFUNDED', refundedAt: new Date() })
        .where(eq(payments.providerChargeId, data.providerChargeId))
        .returning({ orderId: payments.orderId })

      if (!charge) {
        return false
      }

      await tx
        .update(orders)
        .set({ paymentStatus: 'REFUNDED' })
        .where(eq(orders.id, charge.orderId))

      return true
    })
  }

  async listExpired(limit: number): Promise<IPendingCharge[]> {
    return this.database.db
      .select(PENDING_CHARGE_COLUMNS)
      .from(payments)
      .where(and(eq(payments.status, 'PENDING'), lt(payments.expiresAt, new Date())))
      .orderBy(asc(payments.expiresAt))
      .limit(limit)
  }

  async listAwaitingRefund(limit: number): Promise<IPendingCharge[]> {
    return this.database.db
      .select(PENDING_CHARGE_COLUMNS)
      .from(payments)
      .where(eq(payments.status, 'REFUND_PENDING'))
      .orderBy(asc(payments.updatedAt))
      .limit(limit)
  }

  async expire(chargeId: string): Promise<IOrderNotificationTarget | null> {
    return this.database.db.transaction(async (tx) => {
      const [charge] = await tx
        .update(payments)
        .set({ status: 'EXPIRED' })
        .where(and(eq(payments.id, chargeId), eq(payments.status, 'PENDING')))
        .returning({ orderId: payments.orderId })

      if (!charge) {
        return null
      }

      const [canceled] = await tx
        .update(orders)
        .set({ status: 'CANCELED', paymentStatus: 'FAILED', finishedAt: new Date() })
        .where(and(eq(orders.id, charge.orderId), eq(orders.status, 'PENDING_PAYMENT')))
        .returning(ORDER_NOTIFICATION_COLUMNS)

      if (!canceled) {
        return null
      }

      await tx.insert(orderStatusHistory).values({
        orderId: charge.orderId,
        fromStatus: 'PENDING_PAYMENT',
        toStatus: 'CANCELED',
        actorType: 'SYSTEM',
        actorId: null,
        reason: 'Pix não pago dentro do prazo.'
      })

      return canceled
    })
  }

  async markRefunded(chargeId: string): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      const [charge] = await tx
        .update(payments)
        .set({ status: 'REFUNDED', refundedAt: new Date() })
        .where(and(eq(payments.id, chargeId), eq(payments.status, 'REFUND_PENDING')))
        .returning({ orderId: payments.orderId })

      if (!charge) {
        return
      }

      await tx
        .update(orders)
        .set({ paymentStatus: 'REFUNDED' })
        .where(eq(orders.id, charge.orderId))
    })
  }
}
