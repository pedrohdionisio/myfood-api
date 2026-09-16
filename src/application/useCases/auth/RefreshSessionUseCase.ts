import type { IAuthGateway, IRefreshedAuthSession } from '@/application/interfaces/IAuthGateway.js'

/**
 * Serve os dois pools: o container instancia uma vez por gateway. Sem decorator de DI
 * porque a dependência é escolhida na composição, não resolvida por token.
 */
export class RefreshSessionUseCase {
  constructor(private readonly authGateway: IAuthGateway) {}

  async execute(refreshToken: string): Promise<IRefreshedAuthSession> {
    return this.authGateway.refreshSession(refreshToken)
  }
}
