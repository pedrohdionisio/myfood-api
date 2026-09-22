import type { IAuthGateway } from '@/application/interfaces/IAuthGateway.js'

export class ForgotPasswordUseCase {
  constructor(private readonly authGateway: IAuthGateway) {}

  async execute(email: string): Promise<void> {
    await this.authGateway.forgotPassword(email)
  }
}
