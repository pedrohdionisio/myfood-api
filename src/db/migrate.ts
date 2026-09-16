import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, sql } from './client.js'

async function main(): Promise<void> {
  await migrate(db, { migrationsFolder: 'src/db/migrations' })
  process.stdout.write('migrations applied\n')
}

try {
  await main()
} catch (error) {
  process.stderr.write(`migration failed: ${error instanceof Error ? error.message : error}\n`)
  process.exitCode = 1
} finally {
  await sql.end()
}
