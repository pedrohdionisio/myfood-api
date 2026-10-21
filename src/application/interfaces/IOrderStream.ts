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

export interface IOrderStream {
  /**
   * Entrega o evento aos dashboards conectados ao restaurante. Nunca rejeita: a mudança já foi
   * gravada, e o dashboard recarrega a lista ao reconectar, então um evento perdido não é um
   * pedido perdido.
   */
  publish(restaurantId: string, event: IOrderStreamEvent): Promise<void>
}
