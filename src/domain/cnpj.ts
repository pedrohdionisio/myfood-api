function checkDigit(digits: string, length: number): number {
  let weight = length - 7
  let sum = 0

  for (let index = 0; index < length; index++) {
    sum += Number(digits[index]) * weight--

    if (weight < 2) {
      weight = 9
    }
  }

  const rest = sum % 11

  return rest < 2 ? 0 : 11 - rest
}

export function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) {
    return false
  }

  return (
    checkDigit(digits, 12) === Number(digits[12]) && checkDigit(digits, 13) === Number(digits[13])
  )
}
