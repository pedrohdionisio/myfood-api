import { inject, injectable } from 'tsyringe'
import type { IPushTokensRepository } from '@/application/interfaces/IPushTokensRepository.js'
import { TOKENS } from '@/di/tokens.js'

export interface IUnregisterPushTokenInput {
  customerId: string
  token: string
}

@injectable()
export class UnregisterPushTokenUseCase {
  constructor(
    @inject(TOKENS.PushTokensRepository)
    private readonly pushTokens: IPushTokensRepository
  ) {}

  async execute(input: IUnregisterPushTokenInput): Promise<void> {
    await this.pushTokens.deleteByCustomerAndToken(input.customerId, input.token)
  }
}
