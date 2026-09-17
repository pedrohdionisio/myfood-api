import { inject, injectable } from 'tsyringe'
import type { IProduct, IProductsRepository } from '@/application/interfaces/IProductsRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class SetProductAvailabilityUseCase {
  constructor(@inject(TOKENS.ProductsRepository) private readonly products: IProductsRepository) {}

  async execute(restaurantId: string, id: string, isAvailable: boolean): Promise<IProduct> {
    return this.products.setAvailability(restaurantId, id, isAvailable)
  }
}
