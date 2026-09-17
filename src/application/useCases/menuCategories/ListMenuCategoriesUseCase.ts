import { inject, injectable } from 'tsyringe'
import type {
  IMenuCategoriesRepository,
  IMenuCategory
} from '@/application/interfaces/IMenuCategoriesRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class ListMenuCategoriesUseCase {
  constructor(
    @inject(TOKENS.MenuCategoriesRepository)
    private readonly menuCategories: IMenuCategoriesRepository
  ) {}

  async execute(restaurantId: string): Promise<IMenuCategory[]> {
    return this.menuCategories.listByRestaurant(restaurantId)
  }
}
