import { inject, injectable } from 'tsyringe'
import type {
  IOpeningHour,
  IOpeningHoursRepository
} from '@/application/interfaces/IOpeningHoursRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { type IShift, validateOpeningHours } from '@/domain/opening-hours.js'

@injectable()
export class ReplaceOpeningHoursUseCase {
  constructor(
    @inject(TOKENS.OpeningHoursRepository) private readonly openingHours: IOpeningHoursRepository
  ) {}

  async execute(restaurantId: string, shifts: IShift[]): Promise<IOpeningHour[]> {
    validateOpeningHours(shifts)

    return this.openingHours.replaceAll(restaurantId, shifts)
  }
}
