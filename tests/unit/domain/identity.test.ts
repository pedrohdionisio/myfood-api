import { describe, expect, it } from 'vitest'
import { isSameCity } from '@/domain/address.js'
import { isValidCnpj } from '@/domain/cnpj.js'
import { slugify } from '@/domain/slug.js'

describe('isValidCnpj', () => {
  it('should accept a CNPJ with correct check digits', () => {
    expect(isValidCnpj('11222333000181')).toBe(true)
  })

  it.each([
    ['wrong check digit', '11222333000182'],
    ['repeated digits', '11111111111111'],
    ['too short', '1122233300018'],
    ['formatted', '11.222.333/0001-81']
  ])('should reject %s', (_, value) => {
    expect(isValidCnpj(value)).toBe(false)
  })
})

describe('slugify', () => {
  it('should remove accents, lowercase and join words with hyphens', () => {
    expect(slugify('Açaí & Cia. do Zé')).toBe('acai-cia-do-ze')
  })

  it('should fall back when nothing is left', () => {
    expect(slugify('!!!')).toBe('restaurante')
  })

  it('should cap the length without leaving a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(71)} b`)

    expect(slug.length).toBeLessThanOrEqual(72)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('isSameCity', () => {
  it('should ignore accents and case in the city name', () => {
    expect(isSameCity({ city: 'São Paulo', state: 'SP' }, { city: 'sao paulo', state: 'SP' })).toBe(
      true
    )
  })

  it('should distinguish cities with the same name in different states', () => {
    expect(isSameCity({ city: 'Bom Jesus', state: 'PI' }, { city: 'Bom Jesus', state: 'RS' })).toBe(
      false
    )
  })
})
