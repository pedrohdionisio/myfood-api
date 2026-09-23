import { asc, isNull } from 'drizzle-orm'
import type { ProcessOrderEventUseCase } from '@/application/useCases/analytics/ProcessOrderEventUseCase.js'
import { outboxEvents } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import type { ITestContext } from './app.js'

export function processOrderEvent(t: ITestContext) {
  return t.container.resolve<ProcessOrderEventUseCase>(TOKENS.ProcessOrderEventUseCase)
}

// Faz o papel do outbox-publisher e do consumidor da fila juntos, sem SQS no meio.
export async function drainOutbox(t: ITestContext) {
  const pending = await t.db
    .select({ id: outboxEvents.id, type: outboxEvents.type, orderId: outboxEvents.orderId })
    .from(outboxEvents)
    .where(isNull(outboxEvents.publishedAt))
    .orderBy(asc(outboxEvents.createdAt))

  for (const event of pending) {
    await processOrderEvent(t).execute(event)
  }

  await t.db
    .update(outboxEvents)
    .set({ publishedAt: new Date() })
    .where(isNull(outboxEvents.publishedAt))

  return pending
}
