import type { IOrderStream, IOrderStreamEvent } from '@/application/interfaces/IOrderStream.js'

export class FakeOrderStream implements IOrderStream {
  readonly published: { restaurantId: string; event: IOrderStreamEvent }[] = []

  reset(): void {
    this.published.length = 0
  }

  async publish(restaurantId: string, event: IOrderStreamEvent): Promise<void> {
    this.published.push({ restaurantId, event })
  }

  eventsFor(restaurantId: string): IOrderStreamEvent[] {
    return this.published
      .filter((entry) => entry.restaurantId === restaurantId)
      .map((entry) => entry.event)
  }
}
