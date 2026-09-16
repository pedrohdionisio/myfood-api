import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export interface DatabaseConnection {
  db: ReturnType<typeof drizzle<typeof schema>>
  close: () => Promise<void>
}

export type Transaction = Parameters<Parameters<DatabaseConnection['db']['transaction']>[0]>[0]

export function createDatabaseConnection(
  databaseUrl: string,
  options: { max?: number } = {}
): DatabaseConnection {
  const client = postgres(databaseUrl, { max: options.max ?? 10 })

  return {
    db: drizzle(client, { schema, casing: 'snake_case' }),
    close: () => client.end()
  }
}
