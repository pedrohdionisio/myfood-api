import { inject, injectable } from 'tsyringe'
import type { IProduct, IProductsRepository } from '@/application/interfaces/IProductsRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class ArchiveProductUseCase {
  constructor(@inject(TOKENS.ProductsRepository) private readonly products: IProductsRepository) {}

  async execute(restaurantId: string, id: string): Promise<IProduct> {
    return this.products.archive(restaurantId, id)
  }
}
