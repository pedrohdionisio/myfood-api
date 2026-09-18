import { asc, eq, isNull, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type { IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import type { IOutboxRepository } from '@/application/interfaces/IOutboxRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { outboxEvents } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class DrizzleOutboxRepository implements IOutboxRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async listPending(limit: number): Promise<IOutboxEvent[]> {
    return this.database.db
      .select({ id: outboxEvents.id, type: outboxEvents.type, orderId: outboxEvents.orderId })
      .from(outboxEvents)
      .where(isNull(outboxEvents.publishedAt))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(limit)
  }

  async markPublished(id: string): Promise<void> {
    await this.database.db
      .update(outboxEvents)
      .set({ publishedAt: new Date() })
      .where(eq(outboxEvents.id, id))
  }

  async markFailed(id: string): Promise<void> {
    await this.database.db
      .update(outboxEvents)
      .set({ attempts: sql`${outboxEvents.attempts} + 1` })
      .where(eq(outboxEvents.id, id))
  }
}
