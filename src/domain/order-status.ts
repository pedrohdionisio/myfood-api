import type { ActorType, OrderStatus, PaymentMethod } from './enums.js'
import { DomainError } from './errors.js'

// Dono e entregador são os dois RESTAURANT_USER, mas despachar e confirmar entrega não são a
// mesma permissão. A máquina raciocina em papel; order_status_history grava o ActorType.
export const TRANSITION_ACTORS = ['CUSTOMER', 'OWNER', 'DRIVER', 'SYSTEM'] as const
export type TransitionActor = (typeof TRANSITION_ACTORS)[number]

export type OrderTimestampField =
  | 'confirmedAt'
  | 'readyAt'
  | 'dispatchedAt'
  | 'deliveredAt'
  | 'finishedAt'

type TransitionTable = {
  [From in OrderStatus]?: { [To in OrderStatus]?: readonly TransitionActor[] }
}

const TRANSITIONS: TransitionTable = {
  PENDING_PAYMENT: {
    PENDING: ['SYSTEM'],
    CANCELED: ['SYSTEM']
  },
  PENDING: {
    CONFIRMED: ['OWNER'],
    REJECTED: ['OWNER'],
    // Só daqui o cliente cancela sozinho: depois do aceite a comida pode já estar na panela.
    CANCELED: ['CUSTOMER']
  },
  CONFIRMED: {
    PREPARING: ['OWNER'],
    CANCELED: ['OWNER']
  },
  PREPARING: {
    READY: ['OWNER'],
    CANCELED: ['OWNER']
  },
  READY: {
    // Entregador não se auto-atribui: é esta transição que grava driver_member_id.
    OUT_FOR_DELIVERY: ['OWNER']
  },
  OUT_FOR_DELIVERY: {
    DELIVERED: ['DRIVER'],
    DELIVERY_FAILED: ['DRIVER', 'OWNER']
  }
}

const TIMESTAMPS: { [Status in OrderStatus]?: readonly OrderTimestampField[] } = {
  CONFIRMED: ['confirmedAt'],
  READY: ['readyAt'],
  OUT_FOR_DELIVERY: ['dispatchedAt'],
  DELIVERED: ['deliveredAt', 'finishedAt'],
  DELIVERY_FAILED: ['finishedAt'],
  REJECTED: ['finishedAt'],
  CANCELED: ['finishedAt']
}

export const ACTOR_TYPE_BY_TRANSITION_ACTOR: Record<TransitionActor, ActorType> = {
  CUSTOMER: 'CUSTOMER',
  OWNER: 'RESTAURANT_USER',
  DRIVER: 'RESTAURANT_USER',
  SYSTEM: 'SYSTEM'
}

// Pedido online nasce esperando o Pix: o restaurante só o enxerga quando o pagamento confirma.
export function initialOrderStatus(paymentMethod: PaymentMethod): OrderStatus {
  return paymentMethod === 'ONLINE' ? 'PENDING_PAYMENT' : 'PENDING'
}

export function canTransition(from: OrderStatus, to: OrderStatus, actor: TransitionActor): boolean {
  return TRANSITIONS[from]?.[to]?.includes(actor) ?? false
}

export function assertCanTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor
): void {
  if (canTransition(from, to, actor)) {
    return
  }

  throw new DomainError(
    `Transição ${from} → ${to} não permitida para ${actor}.`,
    `Este pedido não pode mais ir para ${to}.`,
    { from, to }
  )
}

export function timestampFieldsFor(status: OrderStatus): readonly OrderTimestampField[] {
  return TIMESTAMPS[status] ?? []
}
