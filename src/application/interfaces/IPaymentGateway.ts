import type { PaymentChargeStatus } from '@/domain/enums.js'

export interface ICreatePixChargeParams {
  orderId: string
  displayNumber: number
  amountCents: number
  expiresInSeconds: number
}

export interface IPixCharge {
  chargeId: string
  status: PaymentChargeStatus
  amountCents: number
  brCode: string
  platformFeeCents: number | null
  expiresAt: string
}

export interface IPaymentGateway {
  createPixCharge(params: ICreatePixChargeParams): Promise<IPixCharge>

  getChargeStatus(chargeId: string): Promise<PaymentChargeStatus>

  /** Estorno integral. É idempotente no gateway: repetir o mesmo id não gera um segundo estorno. */
  refundCharge(chargeId: string, reason?: string): Promise<void>
}
