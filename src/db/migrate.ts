import { existsSync } from 'node:fs'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDatabaseConnection } from './client.js'

// Lê o ambiente direto em vez de importar src/config/env.ts: migrar só precisa do banco, e o job
// de migration do CI não tem (nem deve ter) as variáveis da AWS e do gateway de pagamento.
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

// DDL vai pela conexão direta: o pooler em modo transação não segura os locks de sessão que a
// migration usa. Localmente não há pooler e a DATABASE_URL serve.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!url) {
  process.stderr.write('DATABASE_URL_UNPOOLED or DATABASE_URL is required\n')
  process.exit(1)
}

const database = createDatabaseConnection(url, { max: 1 })

try {
  await migrate(database.db, { migrationsFolder: 'src/db/migrations' })
  process.stdout.write('migrations applied\n')
} catch (error) {
  process.stderr.write(`migration failed: ${error instanceof Error ? error.message : error}\n`)
  process.exitCode = 1
} finally {
  await database.close()
}
