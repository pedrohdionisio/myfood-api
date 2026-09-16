import { inject, injectable } from 'tsyringe'
import type { IAuthGateway, IAuthSession } from '@/application/interfaces/IAuthGateway.js'
import type {
  IAuthenticatedCustomer,
  ICustomersRepository
} from '@/application/interfaces/ICustomersRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { UnauthorizedError } from '@/domain/errors.js'

export interface ISignInCustomerInput {
  email: string
  password: string
}

export interface ISignInCustomerOutput {
  customer: IAuthenticatedCustomer
  session: IAuthSession
}

@injectable()
export class SignInCustomerUseCase {
  constructor(
    @inject(TOKENS.CustomersRepository) private readonly customers: ICustomersRepository,
    @inject(TOKENS.CustomerAuthGateway) private readonly authGateway: IAuthGateway
  ) {}

  async execute(input: ISignInCustomerInput): Promise<ISignInCustomerOutput> {
    const session = await this.authGateway.signIn(input)
    const customer = await this.customers.findByEmail(input.email)

    if (!customer) {
      throw new UnauthorizedError(
        `Conta Cognito sem customer correspondente: ${input.email}.`,
        'Não foi possível entrar. Fale com o suporte.'
      )
    }

    return { customer, session }
  }
}
