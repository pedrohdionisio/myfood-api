import { inject, injectable } from 'tsyringe'
import type { IProduct, IProductsRepository } from '@/application/interfaces/IProductsRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class ListProductsUseCase {
  constructor(@inject(TOKENS.ProductsRepository) private readonly products: IProductsRepository) {}

  async execute(restaurantId: string, menuCategoryId?: string): Promise<IProduct[]> {
    return this.products.listByRestaurant(restaurantId, menuCategoryId)
  }
}
