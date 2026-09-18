import type { IOutboxEvent } from './IEventPublisher.js'

export interface IOutboxRepository {
  listPending(limit: number): Promise<IOutboxEvent[]>

  markPublished(id: string): Promise<void>

  markFailed(id: string): Promise<void>
}
