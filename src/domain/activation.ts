export const ACTIVATION_REQUIREMENTS = ['OPENING_HOURS', 'AVAILABLE_PRODUCT'] as const
export type ActivationRequirement = (typeof ACTIVATION_REQUIREMENTS)[number]

export interface IActivationChecklist {
  hasOpeningHours: boolean
  hasAvailableProduct: boolean
}

export interface IActivationRequirementState {
  code: ActivationRequirement
  isMet: boolean
}

export function activationRequirementStates(
  checklist: IActivationChecklist
): IActivationRequirementState[] {
  return [
    { code: 'OPENING_HOURS', isMet: checklist.hasOpeningHours },
    { code: 'AVAILABLE_PRODUCT', isMet: checklist.hasAvailableProduct }
  ]
}

export function missingActivationRequirements(
  checklist: IActivationChecklist
): ActivationRequirement[] {
  return activationRequirementStates(checklist)
    .filter((requirement) => !requirement.isMet)
    .map((requirement) => requirement.code)
}
