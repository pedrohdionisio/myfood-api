import type { OrderEventType } from '@/domain/enums.js'

export interface IOutboxEvent {
  id: string
  type: OrderEventType
  orderId: string
}

export interface IEventPublisher {
  publish(event: IOutboxEvent): Promise<void>
}
