import type { OrderStatus } from '@/domain/enums.js'

export type OrderStreamEventType = 'ORDER_PLACED' | 'ORDER_STATUS_CHANGED'

// DTO próprio, e estreito de propósito: o dashboard recebe o suficiente para reagir e recarregar,
// nunca o pedido inteiro — é o que mantém o código de entrega fora do stream (regra 1).
export interface IOrderStreamEvent {
  type: OrderStreamEventType
  orderId: string
  displayNumber: number
  status: OrderStatus
  occurredAt: string
}

export type OrderStreamListener = (event: IOrderStreamEvent) => void

export interface IOrderStream {
  publish(restaurantId: string, event: IOrderStreamEvent): void

  /** Devolve a função que cancela a inscrição; a rota SSE a chama quando o cliente desconecta. */
  subscribe(restaurantId: string, listener: OrderStreamListener): () => void
}
