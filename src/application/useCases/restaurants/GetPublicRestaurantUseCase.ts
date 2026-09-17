import { inject, injectable } from 'tsyringe'
import type {
  IOpeningHour,
  IOpeningHoursRepository
} from '@/application/interfaces/IOpeningHoursRepository.js'
import type {
  IRestaurant,
  IRestaurantsRepository
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'
import { isOpenAt } from '@/domain/opening-hours.js'
import { BUSINESS_TIME_ZONE } from '@/domain/time.js'

export interface IPublicRestaurant extends IRestaurant {
  isOpenNow: boolean
  openingHours: IOpeningHour[]
}

@injectable()
export class GetPublicRestaurantUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository)
    private readonly restaurants: IRestaurantsRepository,
    @inject(TOKENS.OpeningHoursRepository)
    private readonly openingHours: IOpeningHoursRepository
  ) {}

  async execute(slug: string): Promise<IPublicRestaurant> {
    const restaurant = await this.restaurants.findBySlug(slug)

    if (restaurant?.status !== 'ACTIVE') {
      throw new NotFoundError(`Restaurante ${slug} não está ativo.`)
    }

    const openingHours = await this.openingHours.listByRestaurant(restaurant.id)

    return {
      ...restaurant,
      openingHours,
      isOpenNow: isOpenAt(openingHours, new Date(), BUSINESS_TIME_ZONE)
    }
  }
}
