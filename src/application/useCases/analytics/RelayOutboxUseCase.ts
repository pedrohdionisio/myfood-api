import { inject, injectable } from 'tsyringe'
import type { IEventPublisher, IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import type { IOutboxRepository } from '@/application/interfaces/IOutboxRepository.js'
import { TOKENS } from '@/di/tokens.js'

const BATCH_SIZE = 20

export interface IRelayResult {
  published: number
  failed: number
}

export interface IRelayReporter {
  onPublished(event: IOutboxEvent): void
  onError(error: unknown, event: IOutboxEvent): void
}

@injectable()
export class RelayOutboxUseCase {
  constructor(
    @inject(TOKENS.OutboxRepository) private readonly outbox: IOutboxRepository,
    @inject(TOKENS.EventPublisher) private readonly publisher: IEventPublisher
  ) {}

  /**
   * Publica até esvaziar o outbox. Para no primeiro lote com falha: os eventos que falharam
   * continuam pendentes e voltariam no próximo lote, então insistir agora só repetiria o erro.
   */
  async execute(reporter: IRelayReporter): Promise<IRelayResult> {
    const result: IRelayResult = { published: 0, failed: 0 }

    while (true) {
      const pending = await this.outbox.listPending(BATCH_SIZE)
      let failedInBatch = 0

      for (const event of pending) {
        try {
          await this.publisher.publish(event)
          await this.outbox.markPublished(event.id)
          result.published += 1
          reporter.onPublished(event)
        } catch (error) {
          // A linha continua pendente de propósito: publicar duas vezes é inofensivo, porque o
          // consumidor deduplica pelo id do evento. Perder o evento não seria.
          await this.outbox.markFailed(event.id)
          failedInBatch += 1
          reporter.onError(error, event)
        }
      }

      result.failed += failedInBatch

      if (pending.length < BATCH_SIZE || failedInBatch > 0) {
        return result
      }
    }
  }
}
