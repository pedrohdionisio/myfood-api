import { inject, injectable } from 'tsyringe'
import type {
  ICustomerAddress,
  ICustomerAddressesRepository
} from '@/application/interfaces/ICustomerAddressesRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class SetDefaultCustomerAddressUseCase {
  constructor(
    @inject(TOKENS.CustomerAddressesRepository)
    private readonly addresses: ICustomerAddressesRepository
  ) {}

  async execute(customerId: string, id: string): Promise<ICustomerAddress> {
    return this.addresses.setDefault(customerId, id)
  }
}
