import { inject, injectable } from 'tsyringe'
import type { IPushTokensRepository } from '@/application/interfaces/IPushTokensRepository.js'
import { TOKENS } from '@/di/tokens.js'
import type { DevicePlatform } from '@/domain/enums.js'

export interface IRegisterPushTokenInput {
  customerId: string
  token: string
  platform: DevicePlatform
}

@injectable()
export class RegisterPushTokenUseCase {
  constructor(
    @inject(TOKENS.PushTokensRepository)
    private readonly pushTokens: IPushTokensRepository
  ) {}

  async execute(input: IRegisterPushTokenInput): Promise<void> {
    await this.pushTokens.register(input)
  }
}
