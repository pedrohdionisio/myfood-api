import { inject, injectable } from 'tsyringe'
import type { ICustomerAddressesRepository } from '@/application/interfaces/ICustomerAddressesRepository.js'
import type { IOpeningHoursRepository } from '@/application/interfaces/IOpeningHoursRepository.js'
import type {
  IProductSearchHit,
  IProductsRepository
} from '@/application/interfaces/IProductsRepository.js'
import type { IRestaurantsRepository } from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { type IShift, isOpenAt } from '@/domain/opening-hours.js'
import { BUSINESS_TIME_ZONE } from '@/domain/time.js'
import type { IDiscoveredRestaurant } from './ListRestaurantsUseCase.js'
import { resolveCustomerAddress } from './resolveCustomerAddress.js'

export interface ISearchInput {
  customerId: string
  addressId?: string | undefined
  term: string
  limit: number
}

export interface ISearchResult {
  restaurants: IDiscoveredRestaurant[]
  products: IProductSearchHit[]
}

@injectable()
export class SearchUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository)
    private readonly restaurants: IRestaurantsRepository,
    @inject(TOKENS.ProductsRepository)
    private readonly products: IProductsRepository,
    @inject(TOKENS.CustomerAddressesRepository)
    private readonly addresses: ICustomerAddressesRepository,
    @inject(TOKENS.OpeningHoursRepository)
    private readonly openingHours: IOpeningHoursRepository
  ) {}

  async execute(input: ISearchInput): Promise<ISearchResult> {
    const { customerId, addressId, term, limit } = input

    const address = await resolveCustomerAddress(this.addresses, customerId, addressId)
    const filter = { term, city: address.city, state: address.state, limit }

    const [matched, products] = await Promise.all([
      this.restaurants.searchInCity(filter),
      this.products.searchInCity(filter)
    ])

    const shifts = await this.openingHours.listByRestaurants(matched.map((item) => item.id))
    const shiftsByRestaurant = new Map<string, IShift[]>()

    for (const shift of shifts) {
      const list = shiftsByRestaurant.get(shift.restaurantId) ?? []

      list.push(shift)
      shiftsByRestaurant.set(shift.restaurantId, list)
    }

    const now = new Date()

    return {
      restaurants: matched.map((item) => ({
        ...item,
        isOpenNow: isOpenAt(shiftsByRestaurant.get(item.id) ?? [], now, BUSINESS_TIME_ZONE)
      })),
      products
    }
  }
}
