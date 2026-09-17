import { inject, injectable } from 'tsyringe'
import type {
  IMenuCategoriesRepository,
  IMenuCategory
} from '@/application/interfaces/IMenuCategoriesRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { DomainError, NotFoundError } from '@/domain/errors.js'

@injectable()
export class ArchiveMenuCategoryUseCase {
  constructor(
    @inject(TOKENS.MenuCategoriesRepository)
    private readonly menuCategories: IMenuCategoriesRepository
  ) {}

  async execute(restaurantId: string, id: string): Promise<IMenuCategory> {
    const archived = await this.menuCategories.archive(restaurantId, id)

    if (archived) {
      return archived
    }

    const category = await this.menuCategories.findById(restaurantId, id)

    if (!category) {
      throw new NotFoundError(`Categoria ${id} não encontrada no restaurante ${restaurantId}.`)
    }

    if (category.archivedAt) {
      return category
    }

    const activeProducts = await this.menuCategories.countActiveProducts(restaurantId, id)

    throw new DomainError(
      `Categoria ${id} tem ${activeProducts} produto(s) ativo(s).`,
      'Arquive ou mova os produtos desta categoria antes de arquivá-la.',
      { activeProducts }
    )
  }
}
