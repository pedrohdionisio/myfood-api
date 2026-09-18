import { inject, injectable } from 'tsyringe'
import type { IAnalyticsRepository } from '@/application/interfaces/IAnalyticsRepository.js'
import type { IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class ProcessOrderEventUseCase {
  constructor(
    @inject(TOKENS.AnalyticsRepository)
    private readonly analytics: IAnalyticsRepository
  ) {}

  async execute(event: IOutboxEvent): Promise<boolean> {
    return this.analytics.applyOrderEvent(event)
  }
}
