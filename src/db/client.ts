import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export interface IDatabaseConnection {
  db: ReturnType<typeof drizzle<typeof schema>>
  close: () => Promise<void>
}

export type Transaction = Parameters<Parameters<IDatabaseConnection['db']['transaction']>[0]>[0]

export function createDatabaseConnection(
  databaseUrl: string,
  options: { max?: number } = {}
): IDatabaseConnection {
  // Em produção a URL é a pooled do Neon (PgBouncer em modo transação), que não aceita
  // prepared statements nomeados: com prepare ligado, as queries falham ao trocar de conexão.
  const client = postgres(databaseUrl, { max: options.max ?? 10, prepare: false })

  return {
    db: drizzle(client, { schema, casing: 'snake_case' }),
    close: () => client.end()
  }
}
