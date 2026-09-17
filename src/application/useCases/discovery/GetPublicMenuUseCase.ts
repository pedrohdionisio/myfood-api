import { inject, injectable } from 'tsyringe'
import type { IMenuCategoriesRepository } from '@/application/interfaces/IMenuCategoriesRepository.js'
import type { IProduct, IProductsRepository } from '@/application/interfaces/IProductsRepository.js'
import type { IRestaurantsRepository } from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'

export interface IPublicMenuCategory {
  id: string
  name: string
  products: IProduct[]
}

@injectable()
export class GetPublicMenuUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository)
    private readonly restaurants: IRestaurantsRepository,
    @inject(TOKENS.MenuCategoriesRepository)
    private readonly menuCategories: IMenuCategoriesRepository,
    @inject(TOKENS.ProductsRepository)
    private readonly products: IProductsRepository
  ) {}

  async execute(restaurantId: string): Promise<IPublicMenuCategory[]> {
    const restaurant = await this.restaurants.findById(restaurantId)

    if (restaurant?.status !== 'ACTIVE') {
      throw new NotFoundError(`Restaurante ${restaurantId} não está ativo.`)
    }

    const [categories, products] = await Promise.all([
      this.menuCategories.listByRestaurant(restaurantId),
      this.products.listByRestaurant(restaurantId)
    ])

    const productsByCategory = new Map<string, IProduct[]>()

    for (const product of products) {
      const list = productsByCategory.get(product.menuCategoryId) ?? []

      list.push(product)
      productsByCategory.set(product.menuCategoryId, list)
    }

    return categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        products: productsByCategory.get(category.id) ?? []
      }))
      .filter((category) => category.products.length > 0)
  }
}
