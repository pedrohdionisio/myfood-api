import { inject, injectable } from 'tsyringe'
import type {
  IPushTokensRepository,
  PushTokenOwner
} from '@/application/interfaces/IPushTokensRepository.js'
import { TOKENS } from '@/di/tokens.js'
import type { DevicePlatform } from '@/domain/enums.js'

export interface IRegisterPushTokenInput {
  owner: PushTokenOwner
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
