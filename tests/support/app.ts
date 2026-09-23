import { randomInt } from 'node:crypto'
import type { InjectOptions, LightMyRequestResponse } from 'fastify'
import type { DependencyContainer } from 'tsyringe'
import { afterAll, beforeAll, beforeEach, inject } from 'vitest'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { type App, buildApp } from '@/http/app.js'
import { truncateAll, withDatabase, workerDatabaseName } from './database.js'
import { buildTestEnv } from './env.js'
import { buildFakeAdapters, type FakeAdapters } from './fakes/index.js'

export interface IRequestOptions {
  token?: string | undefined
  body?: unknown
  query?: Record<string, string | number | boolean>
  headers?: Record<string, string>
  ip?: string
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ITestContext {
  app: App
  container: DependencyContainer
  database: IDatabaseConnection
  db: IDatabaseConnection['db']
  fakes: FakeAdapters
  request(method: Method, url: string, options?: IRequestOptions): Promise<LightMyRequestResponse>
}

// O rate limit é por IP e vale para o app inteiro (100/min, 10/min no checkout). Um IP novo por
// requisição impede que um arquivo com muitos checkouts esbarre no limite sem estar testando isso.
function randomIp(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`
}

export async function buildTestApp(): Promise<Omit<ITestContext, 'request'>> {
  const poolId = process.env.VITEST_POOL_ID ?? '1'
  const env = buildTestEnv(withDatabase(inject('databaseBaseUrl'), workerDatabaseName(poolId)))
  const fakes = buildFakeAdapters()
  const container = buildContainer(env, fakes)
  const app = await buildApp(env, container)
  await app.ready()

  const database = container.resolve<IDatabaseConnection>(TOKENS.Database)

  return { app, container, database, db: database.db, fakes }
}

export function setupTestApp(): ITestContext {
  const context = {} as ITestContext

  beforeAll(async () => {
    Object.assign(context, await buildTestApp())

    context.request = (method, url, options = {}) => {
      const injectOptions: InjectOptions = {
        method,
        url,
        remoteAddress: options.ip ?? randomIp(),
        headers: {
          ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
          ...options.headers
        }
      }

      if (options.query) {
        injectOptions.query = Object.fromEntries(
          Object.entries(options.query).map(([key, value]) => [key, String(value)])
        )
      }

      if (options.body !== undefined) {
        injectOptions.payload = options.body as string | object
      }

      return context.app.inject(injectOptions)
    }
  })

  beforeEach(async () => {
    await truncateAll(context.database)
    context.fakes.reset()
  })

  afterAll(async () => {
    await context.app?.close()
    await context.database?.close()
  })

  return context
}
