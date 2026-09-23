import { describe, expect, it } from 'vitest'
import { DomainError } from '@/domain/errors.js'
import { type IShift, isOpenAt, validateOpeningHours } from '@/domain/opening-hours.js'
import { BUSINESS_TIME_ZONE } from '@/domain/time.js'

// Datas em UTC; São Paulo é UTC-3. 2026-09-25 é uma sexta-feira (dayOfWeek 5).
const at = (iso: string) => new Date(iso)

describe('isOpenAt', () => {
  const lunch: IShift = { dayOfWeek: 5, opensAt: '11:00', closesAt: '15:00' }

  it('should be open inside a shift, in the business time zone', () => {
    expect(isOpenAt([lunch], at('2026-09-25T14:00:00Z'), BUSINESS_TIME_ZONE)).toBe(true)
  })

  it('should treat opensAt as inclusive and closesAt as exclusive', () => {
    expect(isOpenAt([lunch], at('2026-09-25T14:00:00Z'), BUSINESS_TIME_ZONE)).toBe(true)
    expect(isOpenAt([lunch], at('2026-09-25T18:00:00Z'), BUSINESS_TIME_ZONE)).toBe(false)
    expect(isOpenAt([lunch], at('2026-09-25T13:59:00Z'), BUSINESS_TIME_ZONE)).toBe(false)
  })

  it('should not confuse the UTC day with the business day', () => {
    // 01:00 UTC de sábado ainda é 22:00 de sexta em São Paulo.
    const evening: IShift = { dayOfWeek: 5, opensAt: '18:00', closesAt: '23:00' }
    expect(isOpenAt([evening], at('2026-09-26T01:00:00Z'), BUSINESS_TIME_ZONE)).toBe(true)
  })

  it('should keep a shift that crosses midnight open into the next day', () => {
    const lateNight: IShift = { dayOfWeek: 5, opensAt: '18:00', closesAt: '02:00' }

    expect(isOpenAt([lateNight], at('2026-09-26T04:30:00Z'), BUSINESS_TIME_ZONE)).toBe(true)
    expect(isOpenAt([lateNight], at('2026-09-26T05:00:00Z'), BUSINESS_TIME_ZONE)).toBe(false)
  })

  it('should wrap a Saturday late shift into Sunday', () => {
    const saturday: IShift = { dayOfWeek: 6, opensAt: '20:00', closesAt: '03:00' }

    // Domingo 01:00 em São Paulo.
    expect(isOpenAt([saturday], at('2026-09-27T04:00:00Z'), BUSINESS_TIME_ZONE)).toBe(true)
  })

  it('should be closed with no shifts', () => {
    expect(isOpenAt([], at('2026-09-25T14:00:00Z'), BUSINESS_TIME_ZONE)).toBe(false)
  })
})

describe('validateOpeningHours', () => {
  it('should accept non-overlapping shifts on the same day', () => {
    expect(() =>
      validateOpeningHours([
        { dayOfWeek: 1, opensAt: '11:00', closesAt: '15:00' },
        { dayOfWeek: 1, opensAt: '18:00', closesAt: '23:00' }
      ])
    ).not.toThrow()
  })

  it('should accept back-to-back shifts', () => {
    expect(() =>
      validateOpeningHours([
        { dayOfWeek: 1, opensAt: '11:00', closesAt: '15:00' },
        { dayOfWeek: 1, opensAt: '15:00', closesAt: '18:00' }
      ])
    ).not.toThrow()
  })

  it('should reject a shift that opens and closes at the same time', () => {
    expect(() =>
      validateOpeningHours([{ dayOfWeek: 1, opensAt: '10:00', closesAt: '10:00' }])
    ).toThrow(DomainError)
  })

  it('should reject overlapping shifts on the same day', () => {
    expect(() =>
      validateOpeningHours([
        { dayOfWeek: 1, opensAt: '11:00', closesAt: '15:00' },
        { dayOfWeek: 1, opensAt: '14:00', closesAt: '18:00' }
      ])
    ).toThrow(DomainError)
  })

  it('should reject a midnight-crossing shift that overlaps the next day', () => {
    expect(() =>
      validateOpeningHours([
        { dayOfWeek: 5, opensAt: '18:00', closesAt: '02:00' },
        { dayOfWeek: 6, opensAt: '01:00', closesAt: '05:00' }
      ])
    ).toThrow(DomainError)
  })

  it('should reject a Saturday late shift that overlaps Sunday morning', () => {
    expect(() =>
      validateOpeningHours([
        { dayOfWeek: 6, opensAt: '22:00', closesAt: '04:00' },
        { dayOfWeek: 0, opensAt: '03:00', closesAt: '06:00' }
      ])
    ).toThrow(DomainError)
  })
})
