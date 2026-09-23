import type { OrderStatus } from './enums.js'
import type { TransitionActor } from './order-status.js'

export const ORDER_CHANGES = ['PLACED', 'PAYMENT_CONFIRMED', 'STATUS_CHANGED'] as const
export type OrderChange = (typeof ORDER_CHANGES)[number]

export interface IOrderNotificationText {
  title: string
  body: string
}

export interface IOrderChangeContext {
  change: OrderChange
  status: OrderStatus
  displayNumber: number
  actor: TransitionActor
}

// Nenhum texto daqui cita o código de entrega, nem quando o pedido sai para entrega (regra 1).
const TEXT_BY_STATUS: {
  [Status in OrderStatus]?: (displayNumber: number) => IOrderNotificationText
} = {
  CONFIRMED: (n) => ({
    title: 'Pedido aceito',
    body: `O restaurante aceitou seu pedido #${n}.`
  }),
  PREPARING: (n) => ({
    title: 'Pedido em preparo',
    body: `Seu pedido #${n} já está sendo preparado.`
  }),
  READY: (n) => ({
    title: 'Pedido pronto',
    body: `Seu pedido #${n} está pronto e aguardando o entregador.`
  }),
  OUT_FOR_DELIVERY: (n) => ({
    title: 'Saiu para entrega',
    body: `Seu pedido #${n} está a caminho.`
  }),
  DELIVERED: (n) => ({
    title: 'Pedido entregue',
    body: `Seu pedido #${n} foi entregue. Que tal avaliar?`
  }),
  DELIVERY_FAILED: (n) => ({
    title: 'Entrega não concluída',
    body: `Não conseguimos entregar seu pedido #${n}. Fale com o restaurante.`
  }),
  REJECTED: (n) => ({
    title: 'Pedido recusado',
    body: `O restaurante não pôde aceitar seu pedido #${n}.`
  }),
  CANCELED: (n) => ({
    title: 'Pedido cancelado',
    body: `Seu pedido #${n} foi cancelado.`
  })
}

/** `null` quando não há o que avisar ao cliente — ele mesmo agiu, ou o status não lhe diz nada. */
export function customerNotificationFor(
  context: IOrderChangeContext
): IOrderNotificationText | null {
  // Quem acabou de tocar em "cancelar" não precisa de push dizendo que cancelou.
  if (context.actor === 'CUSTOMER') {
    return null
  }

  if (context.change === 'PAYMENT_CONFIRMED') {
    return {
      title: 'Pagamento confirmado',
      body: `Seu pedido #${context.displayNumber} foi enviado ao restaurante.`
    }
  }

  return TEXT_BY_STATUS[context.status]?.(context.displayNumber) ?? null
}

// Pedido esperando Pix não existe para o restaurante (§12): nem na listagem, nem no stream.
export function isVisibleToRestaurant(status: OrderStatus): boolean {
  return status !== 'PENDING_PAYMENT'
}
