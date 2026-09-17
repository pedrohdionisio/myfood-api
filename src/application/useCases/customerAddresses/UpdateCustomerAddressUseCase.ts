import { inject, injectable } from 'tsyringe'
import type {
  ICustomerAddress,
  ICustomerAddressesRepository,
  IUpdateCustomerAddressData
} from '@/application/interfaces/ICustomerAddressesRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class UpdateCustomerAddressUseCase {
  constructor(
    @inject(TOKENS.CustomerAddressesRepository)
    private readonly addresses: ICustomerAddressesRepository
  ) {}

  async execute(
    customerId: string,
    id: string,
    data: IUpdateCustomerAddressData
  ): Promise<ICustomerAddress> {
    return this.addresses.update(customerId, id, data)
  }
}
