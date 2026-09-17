import { randomInt } from 'node:crypto'

export interface IDeliveryFeeSource {
  deliveryFeeCents: number
}

export function resolveDeliveryFee(restaurant: IDeliveryFeeSource): number {
  return restaurant.deliveryFeeCents
}

// Quatro dígitos são 10.000 combinações: sem limite, um entregador marca entregue sem falar com
// o cliente. O limite é por pedido, não por entregador.
export const MAX_FAILED_CONFIRMATIONS = 5
export const CONFIRMATION_WINDOW_MINUTES = 15

export function generateDeliveryCode(): string {
  return String(randomInt(0, 10_000)).padStart(4, '0')
}
