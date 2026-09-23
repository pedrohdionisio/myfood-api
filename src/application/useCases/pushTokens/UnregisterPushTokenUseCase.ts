import { inject, injectable } from 'tsyringe'
import type {
  IPushTokensRepository,
  PushTokenOwner
} from '@/application/interfaces/IPushTokensRepository.js'
import { TOKENS } from '@/di/tokens.js'

export interface IUnregisterPushTokenInput {
  owner: PushTokenOwner
  token: string
}

@injectable()
export class UnregisterPushTokenUseCase {
  constructor(
    @inject(TOKENS.PushTokensRepository)
    private readonly pushTokens: IPushTokensRepository
  ) {}

  async execute(input: IUnregisterPushTokenInput): Promise<void> {
    await this.pushTokens.deleteByOwnerAndToken(input.owner, input.token)
  }
}
