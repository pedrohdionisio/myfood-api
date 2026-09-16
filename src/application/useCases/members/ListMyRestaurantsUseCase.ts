import { inject, injectable } from 'tsyringe'
import type {
  IMembershipsRepository,
  IRestaurantSummary
} from '@/application/interfaces/IMembershipsRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class ListMyRestaurantsUseCase {
  constructor(
    @inject(TOKENS.MembershipsRepository) private readonly memberships: IMembershipsRepository
  ) {}

  async execute(userId: string): Promise<IRestaurantSummary[]> {
    return this.memberships.listByUser(userId)
  }
}
