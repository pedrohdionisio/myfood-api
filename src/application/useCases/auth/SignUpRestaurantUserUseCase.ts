import { inject, injectable } from 'tsyringe'
import type { IAuthGateway, IAuthSession } from '@/application/interfaces/IAuthGateway.js'
import type {
  IAuthenticatedRestaurantUser,
  IRestaurantUsersRepository
} from '@/application/interfaces/IRestaurantUsersRepository.js'
import { TOKENS } from '@/di/tokens.js'

export interface ISignUpRestaurantUserInput {
  name: string
  email: string
  password: string
  phone?: string | undefined
}

export interface ISignUpRestaurantUserOutput {
  user: IAuthenticatedRestaurantUser
  session: IAuthSession
}

/**
 * Cadastro do dono. Ele nasce sem nenhum vínculo: o restaurante e o membership OWNER só
 * existem depois do POST /restaurants. Até lá ele autentica e não enxerga restaurante nenhum.
 */
@injectable()
export class SignUpRestaurantUserUseCase {
  constructor(
    @inject(TOKENS.RestaurantUsersRepository)
    private readonly users: IRestaurantUsersRepository,
    @inject(TOKENS.RestaurantAuthGateway) private readonly authGateway: IAuthGateway
  ) {}

  async execute(input: ISignUpRestaurantUserInput): Promise<ISignUpRestaurantUserOutput> {
    const { name, email, password, phone } = input

    const { cognitoSub } = await this.authGateway.createUser({ email, name, password })

    try {
      const user = await this.users.create({ cognitoSub, name, email, phone })
      const session = await this.authGateway.signIn({ email, password })

      return { user, session }
    } catch (error) {
      await this.authGateway.deleteUser(email)

      throw error
    }
  }
}
