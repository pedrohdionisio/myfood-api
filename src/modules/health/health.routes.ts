import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { sql } from '@/db/client.js'

const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
  uptimeSeconds: z.number()
})

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness and database connectivity',
        response: {
          200: healthResponseSchema,
          503: healthResponseSchema
        }
      },
      config: { rateLimit: false }
    },
    async (_request, reply) => {
      let database: 'up' | 'down' = 'up'

      try {
        await sql`SELECT 1`
      } catch (error) {
        database = 'down'
        app.log.error({ err: error }, 'database health check failed')
      }

      return reply.status(database === 'up' ? 200 : 503).send({
        status: database === 'up' ? 'ok' : 'degraded',
        database,
        uptimeSeconds: Math.round(process.uptime())
      })
    }
  )
}
