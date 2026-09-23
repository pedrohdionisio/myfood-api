import { inject, injectable } from 'tsyringe'
import type {
  IAuthenticatedCustomer,
  ICustomersRepository,
  IUpdateCustomerProfileData
} from '@/application/interfaces/ICustomersRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class UpdateCustomerProfileUseCase {
  constructor(
    @inject(TOKENS.CustomersRepository) private readonly customers: ICustomersRepository
  ) {}

  async execute(
    customerId: string,
    data: IUpdateCustomerProfileData
  ): Promise<IAuthenticatedCustomer> {
    return this.customers.updateProfile(customerId, data)
  }
}
