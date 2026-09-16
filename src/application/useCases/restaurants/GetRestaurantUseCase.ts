import { inject, injectable } from 'tsyringe'
import type {
  IRestaurant,
  IRestaurantsRepository
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'

@injectable()
export class GetRestaurantUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository) private readonly restaurants: IRestaurantsRepository
  ) {}

  async execute(restaurantId: string): Promise<IRestaurant> {
    const restaurant = await this.restaurants.findById(restaurantId)

    if (!restaurant) {
      throw new NotFoundError(`Restaurante ${restaurantId} não encontrado.`)
    }

    return restaurant
  }
}
