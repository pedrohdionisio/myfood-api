import { sql } from 'drizzle-orm'
import type { DependencyContainer } from 'tsyringe'
import type { DatabaseConnection } from '@/db/client.js'
import { TOKENS } from '@/di/tokens.js'
import { healthResponseSchema, readyResponseSchema } from '@/schemas/health.js'
import type { App } from '../app.js'

export function registerHealthRoutes(app: App, container: DependencyContainer): void {
  const database = container.resolve<DatabaseConnection>(TOKENS.Database)

  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness',
        response: { 200: healthResponseSchema }
      },
      config: { rateLimit: false }
    },
    async () => ({ status: 'ok' as const, uptimeSeconds: Math.round(process.uptime()) })
  )

  app.get(
    '/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness: a API consegue falar com o banco',
        response: { 200: readyResponseSchema, 503: readyResponseSchema }
      },
      config: { rateLimit: false }
    },
    async (request, reply) => {
      try {
        await database.db.execute(sql`select 1`)

        return { status: 'ready' as const, database: 'up' as const }
      } catch (error) {
        request.log.error({ err: error }, 'readiness falhou: banco inacessível')

        return reply.status(503).send({ status: 'unavailable', database: 'down' })
      }
    }
  )
}
