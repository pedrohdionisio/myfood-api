import type { IMenuCategoriesRepository } from '@/application/interfaces/IMenuCategoriesRepository.js'
import { DomainError, NotFoundError } from '@/domain/errors.js'
import { isImageKeyOwnedBy } from '@/domain/images.js'

export async function assertUsableCategory(
  menuCategories: IMenuCategoriesRepository,
  restaurantId: string,
  menuCategoryId: string
): Promise<void> {
  const category = await menuCategories.findById(restaurantId, menuCategoryId)

  if (!category) {
    throw new NotFoundError(
      `Categoria ${menuCategoryId} não encontrada no restaurante ${restaurantId}.`
    )
  }

  // Produto em categoria arquivada nunca apareceria no menu, que é agrupado por categoria.
  // É também o que impede um produto de escapar pela brecha do arquivamento da categoria.
  if (category.archivedAt) {
    throw new DomainError(
      `Categoria ${menuCategoryId} está arquivada.`,
      'Esta categoria está arquivada. Escolha outra.'
    )
  }
}

export function assertOwnedImageKey(
  restaurantId: string,
  imageKey: string | null | undefined
): void {
  if (imageKey && !isImageKeyOwnedBy(imageKey, restaurantId, 'PRODUCT_IMAGE')) {
    throw new DomainError(
      `Chave ${imageKey} não pertence ao restaurante ${restaurantId} como PRODUCT_IMAGE.`,
      'Esta imagem não pertence ao restaurante.'
    )
  }
}
