import { randomInt } from 'node:crypto'

export interface IDeliveryFeeSource {
  deliveryFeeCents: number
}

export function resolveDeliveryFee(restaurant: IDeliveryFeeSource): number {
  return restaurant.deliveryFeeCents
}

export function generateDeliveryCode(): string {
  return String(randomInt(0, 10_000)).padStart(4, '0')
}
