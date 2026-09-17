import { inject, injectable } from 'tsyringe'
import type {
  ICreateCustomerAddressData,
  ICustomerAddress,
  ICustomerAddressesRepository
} from '@/application/interfaces/ICustomerAddressesRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class CreateCustomerAddressUseCase {
  constructor(
    @inject(TOKENS.CustomerAddressesRepository)
    private readonly addresses: ICustomerAddressesRepository
  ) {}

  async execute(data: ICreateCustomerAddressData): Promise<ICustomerAddress> {
    return this.addresses.create(data)
  }
}
