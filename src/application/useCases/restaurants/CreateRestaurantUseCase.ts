import { inject, injectable } from 'tsyringe'
import type {
  ICreateRestaurantData,
  IRestaurant,
  IRestaurantsRepository
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { slugify } from '@/domain/slug.js'

export type ICreateRestaurantInput = Omit<ICreateRestaurantData, 'slug' | 'ownerUserId'>

@injectable()
export class CreateRestaurantUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository) private readonly restaurants: IRestaurantsRepository
  ) {}

  async execute(ownerUserId: string, input: ICreateRestaurantInput): Promise<IRestaurant> {
    const slug = await this.restaurants.findAvailableSlug(slugify(input.tradeName))

    return this.restaurants.create({ ...input, slug, ownerUserId })
  }
}
