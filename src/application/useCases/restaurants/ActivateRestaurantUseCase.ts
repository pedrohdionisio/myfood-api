import { inject, injectable } from 'tsyringe'
import type {
  IRestaurant,
  IRestaurantsRepository
} from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { missingActivationRequirements } from '@/domain/activation.js'
import { DomainError } from '@/domain/errors.js'

@injectable()
export class ActivateRestaurantUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository) private readonly restaurants: IRestaurantsRepository
  ) {}

  async execute(restaurantId: string): Promise<IRestaurant> {
    const checklist = await this.restaurants.findActivationChecklist(restaurantId)
    const missing = missingActivationRequirements(checklist)

    if (missing.length > 0) {
      throw new DomainError(
        `Restaurante ${restaurantId} não pode ser ativado, falta: ${missing.join(', ')}.`,
        'Complete o cadastro antes de publicar o restaurante.',
        { missing }
      )
    }

    return this.restaurants.setStatus(restaurantId, 'ACTIVE')
  }
}
