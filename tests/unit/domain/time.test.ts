import { describe, expect, it } from 'vitest'
import { toBusinessDate } from '@/domain/time.js'

describe('toBusinessDate', () => {
  it('should keep a late-night order on the São Paulo day, not the UTC one', () => {
    expect(toBusinessDate(new Date('2026-09-26T02:30:00Z'))).toBe('2026-09-25')
  })

  it('should move to the next day at São Paulo midnight', () => {
    expect(toBusinessDate(new Date('2026-09-26T03:00:00Z'))).toBe('2026-09-26')
  })
})
