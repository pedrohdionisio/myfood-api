import type { IEventPublisher, IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'

export class FakeEventPublisher implements IEventPublisher {
  readonly published: IOutboxEvent[] = []
  readonly failingIds = new Set<string>()

  reset(): void {
    this.published.length = 0
    this.failingIds.clear()
  }

  async publish(event: IOutboxEvent): Promise<void> {
    if (this.failingIds.has(event.id)) {
      throw new Error(`fila indisponível para ${event.id}`)
    }

    this.published.push(event)
  }
}
