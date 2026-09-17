import { inject, injectable } from 'tsyringe'
import type {
  IRestaurant,
  IRestaurantsRepository
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class SetAcceptingOrdersUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository) private readonly restaurants: IRestaurantsRepository
  ) {}

  async execute(restaurantId: string, isAcceptingOrders: boolean): Promise<IRestaurant> {
    return this.restaurants.setAcceptingOrders(restaurantId, isAcceptingOrders)
  }
}
