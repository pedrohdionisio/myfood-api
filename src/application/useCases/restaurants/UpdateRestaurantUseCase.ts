import { inject, injectable } from 'tsyringe'
import type {
  IRestaurant,
  IRestaurantsRepository,
  IUpdateRestaurantData
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class UpdateRestaurantUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository) private readonly restaurants: IRestaurantsRepository
  ) {}

  async execute(restaurantId: string, input: IUpdateRestaurantData): Promise<IRestaurant> {
    return this.restaurants.update(restaurantId, input)
  }
}
