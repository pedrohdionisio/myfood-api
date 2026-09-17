import { inject, injectable } from 'tsyringe'
import type {
  IMenuCategoriesRepository,
  IMenuCategory
} from '@/application/interfaces/IMenuCategoriesRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { DomainError } from '@/domain/errors.js'

@injectable()
export class ReorderMenuCategoriesUseCase {
  constructor(
    @inject(TOKENS.MenuCategoriesRepository)
    private readonly menuCategories: IMenuCategoriesRepository
  ) {}

  async execute(restaurantId: string, orderedIds: string[]): Promise<IMenuCategory[]> {
    const current = await this.menuCategories.listByRestaurant(restaurantId)
    const currentIds = new Set(current.map((category) => category.id))
    const sent = new Set(orderedIds)

    const unknown = orderedIds.filter((id) => !currentIds.has(id))
    const missing = current.filter((category) => !sent.has(category.id)).map(({ id }) => id)

    if (unknown.length > 0 || missing.length > 0) {
      throw new DomainError(
        `Reordenação inválida no restaurante ${restaurantId}.`,
        'Envie todas as categorias ativas, uma única vez cada.',
        { unknown, missing }
      )
    }

    return this.menuCategories.reorder(restaurantId, orderedIds)
  }
}
