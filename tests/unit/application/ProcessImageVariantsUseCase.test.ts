import { describe, expect, it } from 'vitest'
import { ProcessImageVariantsUseCase } from '@/application/useCases/uploads/ProcessImageVariantsUseCase.js'
import { buildImageKey, originalObjectKey, variantObjectKey } from '@/domain/images.js'
import { FakeImageProcessor, FakeStorageGateway } from '../../support/fakes/index.js'

const imageKey = buildImageKey(
  '0199a1b2-0000-7000-8000-000000000001',
  'RESTAURANT_LOGO',
  '0199a1b2-0000-7000-8000-0000000000aa'
)

describe('ProcessImageVariantsUseCase', () => {
  it('should write one webp variant per size from the original', async () => {
    const storage = new FakeStorageGateway()
    storage.objects.set(originalObjectKey(imageKey), Buffer.from('original'))

    const result = await new ProcessImageVariantsUseCase(storage, new FakeImageProcessor()).execute(
      originalObjectKey(imageKey)
    )

    const expected = (['sm', 'md', 'lg'] as const).map((variant) =>
      variantObjectKey(imageKey, variant)
    )
    expect(result).toEqual({ imageKey, variantKeys: expected })
    expect(expected.every((key) => storage.objects.has(key))).toBe(true)
  })

  it('should ignore objects that are not recognizable originals', async () => {
    const storage = new FakeStorageGateway()

    const result = await new ProcessImageVariantsUseCase(storage, new FakeImageProcessor()).execute(
      'originals/something-else.jpg'
    )

    expect(result).toBeNull()
    expect(storage.objects.size).toBe(0)
  })
})
