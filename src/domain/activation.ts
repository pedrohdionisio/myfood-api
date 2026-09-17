export const ACTIVATION_REQUIREMENTS = ['OPENING_HOURS', 'AVAILABLE_PRODUCT'] as const
export type ActivationRequirement = (typeof ACTIVATION_REQUIREMENTS)[number]

export interface IActivationChecklist {
  hasOpeningHours: boolean
  hasAvailableProduct: boolean
}

export function missingActivationRequirements(
  checklist: IActivationChecklist
): ActivationRequirement[] {
  const missing: ActivationRequirement[] = []

  if (!checklist.hasOpeningHours) {
    missing.push('OPENING_HOURS')
  }

  if (!checklist.hasAvailableProduct) {
    missing.push('AVAILABLE_PRODUCT')
  }

  return missing
}
