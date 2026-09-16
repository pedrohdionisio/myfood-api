import { inject, injectable } from 'tsyringe'
import type { IAuthGateway, IAuthSession } from '@/application/interfaces/IAuthGateway.js'
import type {
  IAuthenticatedCustomer,
  ICustomersRepository
} from '@/application/interfaces/ICustomersRepository.js'
import { TOKENS } from '@/di/tokens.js'

export interface ISignUpCustomerInput {
  name: string
  email: string
  password: string
  phone?: string | undefined
}

export interface ISignUpCustomerOutput {
  customer: IAuthenticatedCustomer
  session: IAuthSession
}

@injectable()
export class SignUpCustomerUseCase {
  constructor(
    @inject(TOKENS.CustomersRepository) private readonly customers: ICustomersRepository,
    @inject(TOKENS.CustomerAuthGateway) private readonly authGateway: IAuthGateway
  ) {}

  async execute(input: ISignUpCustomerInput): Promise<ISignUpCustomerOutput> {
    const { name, email, password, phone } = input

    const { cognitoSub } = await this.authGateway.createUser({ email, name, password })

    try {
      const customer = await this.customers.create({ cognitoSub, name, email, phone })
      const session = await this.authGateway.signIn({ email, password })

      return { customer, session }
    } catch (error) {
      await this.authGateway.deleteUser(email)

      throw error
    }
  }
}
