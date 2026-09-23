import { sql } from 'drizzle-orm'
import type { IDatabaseConnection } from '@/db/client.js'

export function workerDatabaseName(poolId: string | number): string {
  return `myfood_test_${poolId}`
}

export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}

// cuisine_categories vem populada pela migration 0007: limpá-la faria os testes rodarem num banco
// diferente do que as migrations entregam.
const PRESERVED_TABLES = ['cuisine_categories']

export async function truncateAll(database: IDatabaseConnection): Promise<void> {
  const rows = await database.db.execute<{ tablename: string }>(sql`
    select tablename from pg_tables
    where schemaname = 'public' and tablename not in ${PRESERVED_TABLES}
  `)

  const tables = rows.map((row) => `"${row.tablename}"`).join(', ')

  await database.db.execute(sql.raw(`truncate ${tables} restart identity cascade`))
}
