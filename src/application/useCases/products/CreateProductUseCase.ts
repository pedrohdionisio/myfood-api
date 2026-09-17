import { inject, injectable } from 'tsyringe'
import type { IMenuCategoriesRepository } from '@/application/interfaces/IMenuCategoriesRepository.js'
import type {
  ICreateProductData,
  IProduct,
  IProductsRepository
} from '@/application/interfaces/IProductsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { assertOwnedImageKey, assertUsableCategory } from './product-guards.js'

@injectable()
export class CreateProductUseCase {
  constructor(
    @inject(TOKENS.ProductsRepository) private readonly products: IProductsRepository,
    @inject(TOKENS.MenuCategoriesRepository)
    private readonly menuCategories: IMenuCategoriesRepository
  ) {}

  async execute(data: ICreateProductData): Promise<IProduct> {
    await assertUsableCategory(this.menuCategories, data.restaurantId, data.menuCategoryId)
    assertOwnedImageKey(data.restaurantId, data.imageKey)

    return this.products.create(data)
  }
}
