import type { PaymentChargeStatus } from '@/domain/enums.js'
import type { IOrderNotificationTarget } from './IOrdersRepository.js'

export interface IPayment {
  id: string
  orderId: string
  providerChargeId: string
  status: PaymentChargeStatus
  amountCents: number
  brCode: string
  receiptUrl: string | null
  expiresAt: string
  paidAt: string | null
  refundedAt: string | null
  createdAt: string
}

export interface ICreatePaymentData {
  orderId: string
  providerChargeId: string
  amountCents: number
  brCode: string
  platformFeeCents: number | null
  expiresAt: Date
}

export interface IConfirmPaymentData {
  /** Id do evento do gateway. É a chave de dedupe: se já existir, nada é aplicado. */
  eventId: string
  event: string
  payload: unknown
  providerChargeId: string
  paidAmountCents: number
  receiptUrl: string | null
}

export interface IRecordRefundData {
  eventId: string
  event: string
  payload: unknown
  providerChargeId: string
}

export interface IPendingCharge {
  id: string
  orderId: string
  providerChargeId: string
  amountCents: number
}

export interface IPaymentsRepository {
  findOpenByOrder(orderId: string): Promise<IPayment | null>

  findLatestByOrder(orderId: string): Promise<IPayment | null>

  create(data: ICreatePaymentData): Promise<IPayment>

  /**
   * Marca a cobrança como paga e leva o pedido de PENDING_PAYMENT para PENDING, com histórico e
   * evento de outbox, tudo na mesma transação. Devolve o pedido afetado, para a notificação, ou
   * `null` quando nada foi aplicado — evento repetido, cobrança já paga ou pedido fora do estado.
   */
  confirm(data: IConfirmPaymentData): Promise<IOrderNotificationTarget | null>

  /** Idem para o estorno concluído: cobrança REFUNDED e orders.payment_status REFUNDED. */
  recordRefund(data: IRecordRefundData): Promise<boolean>

  listExpired(limit: number): Promise<IPendingCharge[]>

  listAwaitingRefund(limit: number): Promise<IPendingCharge[]>

  /** Expira a cobrança e cancela o pedido que ainda estiver em PENDING_PAYMENT. */
  expire(chargeId: string): Promise<IOrderNotificationTarget | null>

  markRefunded(chargeId: string): Promise<void>
}
