import type {
  ICustomerAddress,
  ICustomerAddressesRepository
} from '@/application/interfaces/ICustomerAddressesRepository.js'
import { DomainError, NotFoundError } from '@/domain/errors.js'

// A vitrine e a busca partem do mesmo lugar: a cidade do endereço escolhido pelo cliente, nunca
// de uma cidade vinda na query. Sem addressId vale o padrão, que é o primeiro da listagem.
export async function resolveCustomerAddress(
  addresses: ICustomerAddressesRepository,
  customerId: string,
  addressId?: string | undefined
): Promise<ICustomerAddress> {
  const all = await addresses.listByCustomer(customerId)
  const address = addressId ? all.find((item) => item.id === addressId) : all[0]

  if (address) {
    return address
  }

  if (addressId) {
    throw new NotFoundError(`Endereço ${addressId} não encontrado para o cliente ${customerId}.`)
  }

  throw new DomainError(
    `Cliente ${customerId} não tem endereço cadastrado.`,
    'Cadastre um endereço para ver os restaurantes que entregam na sua região.',
    { reason: 'NO_ADDRESS' }
  )
}
