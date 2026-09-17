import { inject, injectable } from 'tsyringe'
import type { IMenuCategoriesRepository } from '@/application/interfaces/IMenuCategoriesRepository.js'
import type {
  IProduct,
  IProductsRepository,
  IUpdateProductData
} from '@/application/interfaces/IProductsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { assertOwnedImageKey, assertUsableCategory } from './product-guards.js'

@injectable()
export class UpdateProductUseCase {
  constructor(
    @inject(TOKENS.ProductsRepository) private readonly products: IProductsRepository,
    @inject(TOKENS.MenuCategoriesRepository)
    private readonly menuCategories: IMenuCategoriesRepository
  ) {}

  async execute(restaurantId: string, id: string, data: IUpdateProductData): Promise<IProduct> {
    if (data.menuCategoryId) {
      await assertUsableCategory(this.menuCategories, restaurantId, data.menuCategoryId)
    }

    assertOwnedImageKey(restaurantId, data.imageKey)

    return this.products.update(restaurantId, id, data)
  }
}
