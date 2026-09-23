import { createHash } from 'node:crypto'
import type { PaymentMethod } from './enums.js'

export const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000

export interface ICheckoutFingerprintSource {
  restaurantId: string
  addressId: string
  paymentMethod: PaymentMethod
  changeForCents?: number | undefined
  notes?: string | undefined
  items: { productId: string; quantity: number; notes?: string | undefined }[]
}

/** Chaves reivindicadas antes deste instante venceram: não valem para replay e podem ser reusadas. */
export function idempotencyWindowStart(now: Date): Date {
  return new Date(now.getTime() - IDEMPOTENCY_KEY_TTL_MS)
}

// Os itens entram ordenados por produto: a mesma sacola enviada em outra ordem é o mesmo pedido.
export function fingerprintCheckout(source: ICheckoutFingerprintSource): string {
  const canonical = {
    restaurantId: source.restaurantId,
    addressId: source.addressId,
    paymentMethod: source.paymentMethod,
    changeForCents: source.changeForCents ?? null,
    notes: source.notes ?? null,
    items: [...source.items]
      .sort((first, second) => first.productId.localeCompare(second.productId))
      .map((item) => [item.productId, item.quantity, item.notes ?? null])
  }

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}
