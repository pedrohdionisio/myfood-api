import { expect } from 'vitest'

const FORBIDDEN_KEYS = new Set(['deliveryCode', 'delivery_code'])

function findDeliveryCodePaths(value: unknown, path: string): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findDeliveryCodePaths(item, `${path}[${index}]`))
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [
      ...(FORBIDDEN_KEYS.has(key) ? [`${path}.${key}`] : []),
      ...findDeliveryCodePaths(child, `${path}.${key}`)
    ])
  }

  return []
}

export function expectNoDeliveryCode(value: unknown, code?: string): void {
  expect(findDeliveryCodePaths(value, '$')).toEqual([])

  if (code) {
    expect(JSON.stringify(value)).not.toContain(`"${code}"`)
  }
}
