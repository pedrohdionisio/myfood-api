import { inject, injectable } from 'tsyringe'
import type {
  ICuisineCategory,
  ICuisinesRepository
} from '@/application/interfaces/ICuisinesRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class ListCuisineCategoriesUseCase {
  constructor(@inject(TOKENS.CuisinesRepository) private readonly cuisines: ICuisinesRepository) {}

  async execute(): Promise<ICuisineCategory[]> {
    return this.cuisines.listAll()
  }
}
