import { availableParallelism } from 'node:os'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import type { TestProject } from 'vitest/node'
import { withDatabase, workerDatabaseName } from './database.js'

const TEMPLATE_DATABASE = 'myfood_template'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseBaseUrl: string
  }
}

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('postgres')
    .withUsername('myfood')
    .withPassword('myfood')
    .start()

  const baseUrl = container.getConnectionUri()
  const admin = postgres(baseUrl, { max: 1, onnotice: () => {} })

  await admin.unsafe(`CREATE DATABASE ${TEMPLATE_DATABASE}`)

  const template = postgres(withDatabase(baseUrl, TEMPLATE_DATABASE), {
    max: 1,
    onnotice: () => {}
  })
  await migrate(drizzle(template), { migrationsFolder: 'src/db/migrations' })
  await template.end()

  // CREATE DATABASE ... TEMPLATE falha se outra sessão estiver copiando o mesmo template, então os
  // bancos dos workers são criados aqui, em sequência, e não por cada worker ao subir.
  for (let poolId = 1; poolId <= availableParallelism(); poolId++) {
    await admin.unsafe(
      `CREATE DATABASE ${workerDatabaseName(poolId)} TEMPLATE ${TEMPLATE_DATABASE}`
    )
  }

  await admin.end()
  project.provide('databaseBaseUrl', baseUrl)

  return async () => {
    await container.stop()
  }
}
