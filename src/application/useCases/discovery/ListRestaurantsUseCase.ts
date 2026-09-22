import { inject, injectable } from 'tsyringe'
import type {
  ICuisineCategory,
  ICuisinesRepository
} from '@/application/interfaces/ICuisinesRepository.js'
import type { ICustomerAddressesRepository } from '@/application/interfaces/ICustomerAddressesRepository.js'
import type { IOpeningHoursRepository } from '@/application/interfaces/IOpeningHoursRepository.js'
import type {
  IRestaurant,
  IRestaurantsRepository
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { isOpenAt } from '@/domain/opening-hours.js'
import { BUSINESS_TIME_ZONE } from '@/domain/time.js'
import { groupCuisinesByRestaurant, groupShiftsByRestaurant } from './groupByRestaurant.js'
import { resolveCustomerAddress } from './resolveCustomerAddress.js'

export interface IListRestaurantsInput {
  customerId: string
  addressId?: string | undefined
  term?: string | undefined
  cuisineSlug?: string | undefined
  includeClosed: boolean
  page: number
  perPage: number
}

export interface IDiscoveredRestaurant extends IRestaurant {
  isOpenNow: boolean
  cuisines: ICuisineCategory[]
}

export interface IListRestaurantsResult {
  items: IDiscoveredRestaurant[]
  page: number
  perPage: number
  hasMore: boolean
}

// Teto de segurança da leitura descrita em `execute`. Uma cidade que passe disso perde os últimos
// restaurantes da ordenação, e o sintoma é `hasMore: false` cedo demais.
const MAX_CITY_ROWS = 500

@injectable()
export class ListRestaurantsUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository)
    private readonly restaurants: IRestaurantsRepository,
    @inject(TOKENS.CustomerAddressesRepository)
    private readonly addresses: ICustomerAddressesRepository,
    @inject(TOKENS.OpeningHoursRepository)
    private readonly openingHours: IOpeningHoursRepository,
    @inject(TOKENS.CuisinesRepository)
    private readonly cuisines: ICuisinesRepository
  ) {}

  async execute(input: IListRestaurantsInput): Promise<IListRestaurantsResult> {
    const { customerId, addressId, term, cuisineSlug, includeClosed, page, perPage } = input

    const address = await resolveCustomerAddress(this.addresses, customerId, addressId)

    // A cidade inteira é lida antes de paginar porque `isOpenNow` vem do `isOpenAt`, que é regra de
    // domínio em TypeScript (minuto da semana, turno virando a madrugada, fuso). Paginando no SQL,
    // com `includeClosed` falso a página viria com 20 linhas e a tela mostraria só as abertas —
    // páginas curtas e rolagem infinita travando. Levar `isOpenAt` para o SQL duplicaria a regra.
    const rows = await this.restaurants.listActiveByCity({
      city: address.city,
      state: address.state,
      term,
      cuisineSlug,
      limit: MAX_CITY_ROWS
    })

    const shifts = await this.openingHours.listByRestaurants(rows.map((row) => row.id))
    const shiftsByRestaurant = groupShiftsByRestaurant(shifts)
    const now = new Date()

    const withOpenState = rows.map((row) => ({
      ...row,
      isOpenNow: isOpenAt(shiftsByRestaurant.get(row.id) ?? [], now, BUSINESS_TIME_ZONE)
    }))

    const visible = includeClosed
      ? withOpenState
      : withOpenState.filter((restaurant) => restaurant.isOpenNow)

    const offset = (page - 1) * perPage
    const pageRows = visible.slice(offset, offset + perPage)

    const pageCuisines = await this.cuisines.listByRestaurants(pageRows.map((row) => row.id))
    const cuisinesByRestaurant = groupCuisinesByRestaurant(pageCuisines)

    return {
      items: pageRows.map((row) => ({
        ...row,
        cuisines: cuisinesByRestaurant.get(row.id) ?? []
      })),
      page,
      perPage,
      hasMore: visible.length > offset + perPage
    }
  }
}
