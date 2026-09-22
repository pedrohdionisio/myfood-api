import { inject, injectable } from 'tsyringe'
import type { IRestaurantsRepository } from '@/application/interfaces/IRestaurantsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import {
  activationRequirementStates,
  type IActivationRequirementState,
  missingActivationRequirements
} from '@/domain/activation.js'

export interface IActivationChecklistResult {
  isReadyToActivate: boolean
  requirements: IActivationRequirementState[]
}

@injectable()
export class GetActivationChecklistUseCase {
  constructor(
    @inject(TOKENS.RestaurantsRepository) private readonly restaurants: IRestaurantsRepository
  ) {}

  async execute(restaurantId: string): Promise<IActivationChecklistResult> {
    const checklist = await this.restaurants.findActivationChecklist(restaurantId)

    return {
      isReadyToActivate: missingActivationRequirements(checklist).length === 0,
      requirements: activationRequirementStates(checklist)
    }
  }
}
