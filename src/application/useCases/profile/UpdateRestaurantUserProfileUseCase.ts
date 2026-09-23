import { inject, injectable } from 'tsyringe'
import type {
  IAuthenticatedRestaurantUser,
  IRestaurantUsersRepository,
  IUpdateRestaurantUserProfileData
} from '@/application/interfaces/IRestaurantUsersRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class UpdateRestaurantUserProfileUseCase {
  constructor(
    @inject(TOKENS.RestaurantUsersRepository)
    private readonly restaurantUsers: IRestaurantUsersRepository
  ) {}

  async execute(
    restaurantUserId: string,
    data: IUpdateRestaurantUserProfileData
  ): Promise<IAuthenticatedRestaurantUser> {
    return this.restaurantUsers.updateProfile(restaurantUserId, data)
  }
}
