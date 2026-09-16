import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// O bundler do drizzle-kit não resolve o alias "@/", por isso a config lê o ambiente
// direto em vez de importar src/config/env.ts.
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const url = process.env.DATABASE_URL

if (!url) {
  throw new Error('DATABASE_URL is required to run drizzle-kit')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: { url },
  casing: 'snake_case'
})
