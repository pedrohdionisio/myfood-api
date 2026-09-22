import { inject, injectable } from 'tsyringe'
import type {
  ICuisineCategory,
  ICuisinesRepository
} from '@/application/interfaces/ICuisinesRepository.js'
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
  cuisines: ICuisineCategory[]
}

@injectable()
export class GetPublicRestaurantUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository)
    private readonly restaurants: IRestaurantsRepository,
    @inject(TOKENS.OpeningHoursRepository)
    private readonly openingHours: IOpeningHoursRepository,
    @inject(TOKENS.CuisinesRepository)
    private readonly cuisines: ICuisinesRepository
  ) {}

  async execute(slug: string): Promise<IPublicRestaurant> {
    const restaurant = await this.restaurants.findBySlug(slug)

    if (restaurant?.status !== 'ACTIVE') {
      throw new NotFoundError(`Restaurante ${slug} não está ativo.`)
    }

    const [openingHours, cuisines] = await Promise.all([
      this.openingHours.listByRestaurant(restaurant.id),
      this.cuisines.listByRestaurant(restaurant.id)
    ])

    return {
      ...restaurant,
      openingHours,
      cuisines,
      isOpenNow: isOpenAt(openingHours, new Date(), BUSINESS_TIME_ZONE)
    }
  }
}
