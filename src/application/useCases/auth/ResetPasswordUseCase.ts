import type { IAuthGateway, IResetPasswordParams } from '@/application/interfaces/IAuthGateway.js'

export class ResetPasswordUseCase {
  constructor(private readonly authGateway: IAuthGateway) {}

  async execute(input: IResetPasswordParams): Promise<void> {
    await this.authGateway.resetPassword(input)
  }
}
