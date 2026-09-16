import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { env } from '@/config/env.js'
import { createDatabaseConnection } from './client.js'

const database = createDatabaseConnection(env.DATABASE_URL, { max: 1 })

try {
  await migrate(database.db, { migrationsFolder: 'src/db/migrations' })
  process.stdout.write('migrations applied\n')
} catch (error) {
  process.stderr.write(`migration failed: ${error instanceof Error ? error.message : error}\n`)
  process.exitCode = 1
} finally {
  await database.close()
}
