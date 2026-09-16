import { inject, injectable } from 'tsyringe'
import type { IAuthGateway, IAuthSession } from '@/application/interfaces/IAuthGateway.js'
import type {
  IAuthenticatedRestaurantUser,
  IRestaurantUsersRepository
} from '@/application/interfaces/IRestaurantUsersRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { UnauthorizedError } from '@/domain/errors.js'

export interface ISignInRestaurantUserInput {
  email: string
  password: string
}

export interface ISignInRestaurantUserOutput {
  user: IAuthenticatedRestaurantUser
  session: IAuthSession
}

@injectable()
export class SignInRestaurantUserUseCase {
  constructor(
    @inject(TOKENS.RestaurantUsersRepository)
    private readonly users: IRestaurantUsersRepository,
    @inject(TOKENS.RestaurantAuthGateway) private readonly authGateway: IAuthGateway
  ) {}

  async execute(input: ISignInRestaurantUserInput): Promise<ISignInRestaurantUserOutput> {
    const session = await this.authGateway.signIn(input)
    const user = await this.users.findByEmail(input.email)

    if (!user) {
      throw new UnauthorizedError(
        `Conta Cognito sem restaurant_user correspondente: ${input.email}.`,
        'Não foi possível entrar. Fale com o suporte.'
      )
    }

    return { user, session }
  }
}
