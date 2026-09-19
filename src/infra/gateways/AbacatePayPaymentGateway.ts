import type {
  ICreatePixChargeParams,
  IPaymentGateway,
  IPixCharge
} from '@/application/interfaces/IPaymentGateway.js'
import type { PaymentChargeStatus } from '@/domain/enums.js'

const REQUEST_TIMEOUT_MS = 10_000

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly providerCode: string | null
  ) {
    super(message)
    this.name = 'PaymentGatewayError'
  }
}

interface IEnvelope<TData> {
  data: TData | null
  success: boolean
  error: string | null
}

interface IChargeResponse {
  id: string
  amount: number
  status: string
  brCode: string
  platformFee: number | null
  receiptUrl: string | null
  expiresAt: string
}

// UNDER_DISPUTE é dinheiro que entrou e está contestado; sem estado próprio aqui, vale como pago —
// quem trata disputa é o evento transparent.disputed, fora do escopo por ora.
const STATUS_MAP: Record<string, PaymentChargeStatus> = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  APPROVED: 'PAID',
  REDEEMED: 'PAID',
  UNDER_DISPUTE: 'PAID',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELED',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED'
}

export function mapChargeStatus(providerStatus: string): PaymentChargeStatus {
  const mapped = STATUS_MAP[providerStatus]

  if (!mapped) {
    throw new PaymentGatewayError(`Status desconhecido do gateway: ${providerStatus}.`, null)
  }

  return mapped
}

export class AbacatePayPaymentGateway implements IPaymentGateway {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string
  ) {}

  private async request<TData>(
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown }
  ): Promise<TData> {
    let response: Response

    try {
      response = await fetch(`${this.apiUrl}${path}`, {
        method: init.method,
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          ...(init.body === undefined ? {} : { 'content-type': 'application/json' })
        },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      throw new PaymentGatewayError(`Falha ao chamar ${path}: ${String(error)}.`, null)
    }

    const envelope = (await response.json().catch(() => null)) as IEnvelope<TData> | null

    if (!response.ok || !envelope?.success || envelope.data === null) {
      const code = envelope?.error ?? null

      throw new PaymentGatewayError(
        `${path} respondeu ${response.status}${code ? ` (${code})` : ''}.`,
        code
      )
    }

    return envelope.data
  }

  async createPixCharge(params: ICreatePixChargeParams): Promise<IPixCharge> {
    const charge = await this.request<IChargeResponse>('/transparents/create', {
      method: 'POST',
      body: {
        method: 'PIX',
        data: {
          amount: params.amountCents,
          expiresIn: params.expiresInSeconds,
          description: `MyFood — pedido #${params.displayNumber}`,
          externalId: params.orderId,
          metadata: { orderId: params.orderId, displayNumber: params.displayNumber }
        }
      }
    })

    return {
      chargeId: charge.id,
      status: mapChargeStatus(charge.status),
      amountCents: charge.amount,
      brCode: charge.brCode,
      platformFeeCents: charge.platformFee ?? null,
      expiresAt: charge.expiresAt
    }
  }

  async getChargeStatus(chargeId: string): Promise<PaymentChargeStatus> {
    const charge = await this.request<Pick<IChargeResponse, 'status'>>(
      `/transparents/check?id=${encodeURIComponent(chargeId)}`,
      { method: 'GET' }
    )

    return mapChargeStatus(charge.status)
  }

  async refundCharge(chargeId: string, reason?: string): Promise<void> {
    await this.request<{ refundPublicId: string }>('/transparents/refund', {
      method: 'POST',
      body: { id: chargeId, ...(reason ? { reason } : {}) }
    })
  }
}
