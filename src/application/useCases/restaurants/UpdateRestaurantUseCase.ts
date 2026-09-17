import { inject, injectable } from 'tsyringe'
import type {
  IRestaurant,
  IRestaurantsRepository,
  IUpdateRestaurantData
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { DomainError } from '@/domain/errors.js'
import { type ImageKind, isImageKeyOwnedBy } from '@/domain/images.js'

@injectable()
export class UpdateRestaurantUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository) private readonly restaurants: IRestaurantsRepository
  ) {}

  async execute(restaurantId: string, input: IUpdateRestaurantData): Promise<IRestaurant> {
    this.assertOwnsKey(restaurantId, input.logoKey, 'RESTAURANT_LOGO')
    this.assertOwnsKey(restaurantId, input.bannerKey, 'RESTAURANT_BANNER')

    return this.restaurants.update(restaurantId, input)
  }

  private assertOwnsKey(
    restaurantId: string,
    imageKey: string | null | undefined,
    kind: ImageKind
  ): void {
    if (imageKey && !isImageKeyOwnedBy(imageKey, restaurantId, kind)) {
      throw new DomainError(
        `Chave ${imageKey} não pertence ao restaurante ${restaurantId} como ${kind}.`,
        'Esta imagem não pertence ao restaurante.'
      )
    }
  }
}
