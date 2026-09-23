import type {
  ICreatePixChargeParams,
  IPaymentGateway,
  IPixCharge
} from '@/application/interfaces/IPaymentGateway.js'
import type { PaymentChargeStatus } from '@/domain/enums.js'

export class FakePaymentGateway implements IPaymentGateway {
  readonly charges = new Map<string, IPixCharge & { orderId: string }>()
  readonly refunds: string[] = []

  reset(): void {
    this.charges.clear()
    this.refunds.length = 0
  }

  async createPixCharge(params: ICreatePixChargeParams): Promise<IPixCharge> {
    const charge = {
      orderId: params.orderId,
      chargeId: `pix_char_${this.charges.size + 1}_${params.orderId}`,
      status: 'PENDING' as const,
      amountCents: params.amountCents,
      brCode: '00020101021226-fake-brcode',
      platformFeeCents: 80,
      expiresAt: new Date(Date.now() + params.expiresInSeconds * 1000).toISOString()
    }

    this.charges.set(charge.chargeId, charge)

    return charge
  }

  async getChargeStatus(chargeId: string): Promise<PaymentChargeStatus> {
    return this.charges.get(chargeId)?.status ?? 'EXPIRED'
  }

  async refundCharge(chargeId: string): Promise<void> {
    this.refunds.push(chargeId)
  }

  setStatus(chargeId: string, status: PaymentChargeStatus): void {
    const charge = this.charges.get(chargeId)

    if (charge) {
      this.charges.set(chargeId, { ...charge, status })
    }
  }
}
