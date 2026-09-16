import { type DependencyContainer, container as rootContainer } from 'tsyringe'
import type { Env } from '@/config/env.js'
import { createDatabaseConnection, type DatabaseConnection } from '@/db/client.js'
import { TOKENS } from './tokens.js'

export function buildContainer(env: Env): DependencyContainer {
  const container = rootContainer.createChildContainer()

  const database = createDatabaseConnection(env.DATABASE_URL)
  container.register<DatabaseConnection>(TOKENS.Database, { useValue: database })

  return container
}
