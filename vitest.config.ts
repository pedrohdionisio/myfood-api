import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) }

export default defineConfig({
  resolve: { alias },
  test: {
    setupFiles: ['reflect-metadata'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/db/migrations/**', 'src/server.ts', 'src/workers/**']
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] }
      },
      {
        extends: true,
        test: {
          name: 'feature',
          include: ['tests/feature/**/*.test.ts'],
          globalSetup: ['tests/support/global-setup.ts'],
          testTimeout: 20_000,
          hookTimeout: 60_000
        }
      }
    ]
  }
})
