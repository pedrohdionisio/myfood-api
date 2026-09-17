import { inject, injectable } from 'tsyringe'
import type {
  ICustomerAddress,
  ICustomerAddressesRepository
} from '@/application/interfaces/ICustomerAddressesRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class DeleteCustomerAddressUseCase {
  constructor(
    @inject(TOKENS.CustomerAddressesRepository)
    private readonly addresses: ICustomerAddressesRepository
  ) {}

  async execute(customerId: string, id: string): Promise<ICustomerAddress[]> {
    await this.addresses.delete(customerId, id)

    return this.addresses.listByCustomer(customerId)
  }
}
