import { inject, injectable } from 'tsyringe'
import type { ICustomerAddressesRepository } from '@/application/interfaces/ICustomerAddressesRepository.js'
import type { IOpeningHoursRepository } from '@/application/interfaces/IOpeningHoursRepository.js'
import type {
  IRestaurant,
  IRestaurantsRepository
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { DomainError, NotFoundError } from '@/domain/errors.js'
import { type IShift, isOpenAt } from '@/domain/opening-hours.js'
import { BUSINESS_TIME_ZONE } from '@/domain/time.js'

export interface IListRestaurantsInput {
  customerId: string
  addressId?: string | undefined
  page: number
  perPage: number
}

export interface IDiscoveredRestaurant extends IRestaurant {
  isOpenNow: boolean
}

export interface IListRestaurantsResult {
  items: IDiscoveredRestaurant[]
  page: number
  perPage: number
  hasMore: boolean
}

@injectable()
export class ListRestaurantsUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository)
    private readonly restaurants: IRestaurantsRepository,
    @inject(TOKENS.CustomerAddressesRepository)
    private readonly addresses: ICustomerAddressesRepository,
    @inject(TOKENS.OpeningHoursRepository)
    private readonly openingHours: IOpeningHoursRepository
  ) {}

  async execute(input: IListRestaurantsInput): Promise<IListRestaurantsResult> {
    const { customerId, addressId, page, perPage } = input

    const addresses = await this.addresses.listByCustomer(customerId)
    const address = addressId ? addresses.find((item) => item.id === addressId) : addresses[0]

    if (!address) {
      if (addressId) {
        throw new NotFoundError(
          `Endereço ${addressId} não encontrado para o cliente ${customerId}.`
        )
      }

      throw new DomainError(
        `Cliente ${customerId} não tem endereço cadastrado.`,
        'Cadastre um endereço para ver os restaurantes que entregam na sua região.',
        { reason: 'NO_ADDRESS' }
      )
    }

    // Uma linha a mais do que a página resolve o hasMore sem um count sobre a cidade inteira.
    const rows = await this.restaurants.listActiveByCity({
      city: address.city,
      state: address.state,
      limit: perPage + 1,
      offset: (page - 1) * perPage
    })

    const items = rows.slice(0, perPage)
    const shifts = await this.openingHours.listByRestaurants(items.map((item) => item.id))

    const shiftsByRestaurant = new Map<string, IShift[]>()

    for (const shift of shifts) {
      const list = shiftsByRestaurant.get(shift.restaurantId) ?? []

      list.push(shift)
      shiftsByRestaurant.set(shift.restaurantId, list)
    }

    const now = new Date()

    return {
      items: items.map((item) => ({
        ...item,
        isOpenNow: isOpenAt(shiftsByRestaurant.get(item.id) ?? [], now, BUSINESS_TIME_ZONE)
      })),
      page,
      perPage,
      hasMore: rows.length > perPage
    }
  }
}
