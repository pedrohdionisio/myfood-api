import { inject, injectable } from 'tsyringe'
import type {
  IMenuCategoriesRepository,
  IMenuCategory
} from '@/application/interfaces/IMenuCategoriesRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class CreateMenuCategoryUseCase {
  constructor(
    @inject(TOKENS.MenuCategoriesRepository)
    private readonly menuCategories: IMenuCategoriesRepository
  ) {}

  async execute(restaurantId: string, name: string): Promise<IMenuCategory> {
    return this.menuCategories.create({ restaurantId, name })
  }
}
