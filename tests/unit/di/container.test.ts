import { describe, expect, it } from 'vitest'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { buildTestEnv } from '../../support/env.js'
import { buildFakeAdapters } from '../../support/fakes/index.js'

// esbuild não emite design:paramtypes: um @inject esquecido só aparece ao resolver, em runtime.
describe('composition root', () => {
  const container = buildContainer(
    buildTestEnv('postgres://myfood:myfood@localhost:5432/unused'),
    buildFakeAdapters()
  )

  it.each(Object.entries(TOKENS))('should resolve %s', (_, token) => {
    expect(container.resolve(token)).toBeDefined()
  })
})
