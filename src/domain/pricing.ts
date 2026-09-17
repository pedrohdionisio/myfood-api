export interface ILinePricing {
  priceCents: number
  quantity: number
}

export interface ILineTotal {
  unitPriceCents: number
  totalCents: number
}

export function calculateLineTotal(line: ILinePricing): ILineTotal {
  const unitPriceCents = line.priceCents

  return {
    unitPriceCents,
    totalCents: unitPriceCents * line.quantity
  }
}
