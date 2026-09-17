import { inject, injectable } from 'tsyringe'
import type { IMenuCategoriesRepository } from '@/application/interfaces/IMenuCategoriesRepository.js'
import type { IProduct, IProductsRepository } from '@/application/interfaces/IProductsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { DomainError } from '@/domain/errors.js'
import { assertUsableCategory } from './product-guards.js'

@injectable()
export class ReorderProductsUseCase {
  constructor(
    @inject(TOKENS.ProductsRepository) private readonly products: IProductsRepository,
    @inject(TOKENS.MenuCategoriesRepository)
    private readonly menuCategories: IMenuCategoriesRepository
  ) {}

  async execute(
    restaurantId: string,
    menuCategoryId: string,
    orderedIds: string[]
  ): Promise<IProduct[]> {
    await assertUsableCategory(this.menuCategories, restaurantId, menuCategoryId)

    const current = await this.products.listByRestaurant(restaurantId, menuCategoryId)
    const currentIds = new Set(current.map((product) => product.id))
    const sent = new Set(orderedIds)

    const unknown = orderedIds.filter((id) => !currentIds.has(id))
    const missing = current.filter((product) => !sent.has(product.id)).map(({ id }) => id)

    if (unknown.length > 0 || missing.length > 0) {
      throw new DomainError(
        `Reordenação inválida na categoria ${menuCategoryId}.`,
        'Envie todos os produtos ativos da categoria, uma única vez cada.',
        { unknown, missing }
      )
    }

    return this.products.reorder(restaurantId, menuCategoryId, orderedIds)
  }
}
