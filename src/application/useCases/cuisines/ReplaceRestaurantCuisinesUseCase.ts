import { inject, injectable } from 'tsyringe'
import type {
  ICuisineCategory,
  ICuisinesRepository
} from '@/application/interfaces/ICuisinesRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { DomainError } from '@/domain/errors.js'

@injectable()
export class ReplaceRestaurantCuisinesUseCase {
  constructor(@inject(TOKENS.CuisinesRepository) private readonly cuisines: ICuisinesRepository) {}

  async execute(restaurantId: string, cuisineCategoryIds: string[]): Promise<ICuisineCategory[]> {
    const ids = [...new Set(cuisineCategoryIds)]
    const categories = await this.cuisines.listByIds(ids)

    if (categories.length !== ids.length) {
      const known = new Set(categories.map((category) => category.id))
      const unknown = ids.filter((id) => !known.has(id))

      throw new DomainError(
        `Categorias de culinária inexistentes: ${unknown.join(', ')}.`,
        'Uma das categorias escolhidas não existe. Recarregue a lista e tente de novo.',
        { unknownIds: unknown }
      )
    }

    await this.cuisines.replaceForRestaurant(restaurantId, ids)

    return categories
  }
}
