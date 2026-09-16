import { inject, injectable } from 'tsyringe'
import type {
  IOpeningHour,
  IOpeningHoursRepository
} from '@/application/interfaces/IOpeningHoursRepository.js'
import { TOKENS } from '@/di/tokens.js'

@injectable()
export class ListOpeningHoursUseCase {
  constructor(
    @inject(TOKENS.OpeningHoursRepository) private readonly openingHours: IOpeningHoursRepository
  ) {}

  async execute(restaurantId: string): Promise<IOpeningHour[]> {
    return this.openingHours.listByRestaurant(restaurantId)
  }
}
