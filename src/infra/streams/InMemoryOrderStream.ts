import type {
  IOrderStream,
  IOrderStreamEvent,
  OrderStreamListener
} from '@/application/interfaces/IOrderStream.js'

export class InMemoryOrderStream implements IOrderStream {
  private readonly listenersByRestaurant = new Map<string, Set<OrderStreamListener>>()

  publish(restaurantId: string, event: IOrderStreamEvent): void {
    const listeners = this.listenersByRestaurant.get(restaurantId)

    if (!listeners) {
      return
    }

    for (const listener of [...listeners]) {
      listener(event)
    }
  }

  subscribe(restaurantId: string, listener: OrderStreamListener): () => void {
    const listeners = this.listenersByRestaurant.get(restaurantId) ?? new Set<OrderStreamListener>()

    listeners.add(listener)
    this.listenersByRestaurant.set(restaurantId, listeners)

    return () => {
      listeners.delete(listener)

      if (listeners.size === 0) {
        this.listenersByRestaurant.delete(restaurantId)
      }
    }
  }
}
