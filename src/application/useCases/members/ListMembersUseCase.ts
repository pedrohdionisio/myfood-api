import { inject, injectable } from 'tsyringe'
import type {
  IMembershipsRepository,
  ITeamMember
} from '@/application/interfaces/IMembershipsRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class ListMembersUseCase {
  constructor(
    @inject(TOKENS.MembershipsRepository)
    private readonly memberships: IMembershipsRepository
  ) {}

  async execute(restaurantId: string): Promise<ITeamMember[]> {
    return this.memberships.listByRestaurant(restaurantId)
  }
}
