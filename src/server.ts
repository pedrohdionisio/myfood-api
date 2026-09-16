import 'reflect-metadata'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { buildApp } from '@/http/app.js'

const container = buildContainer(env)
const app = await buildApp(env, container)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down')
    app
      .close()
      .then(() => container.resolve<IDatabaseConnection>(TOKENS.Database).close())
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        app.log.error({ err: error }, 'shutdown failed')
        process.exit(1)
      })
  })
}

try {
  await app.listen({ host: env.HOST, port: env.PORT })
} catch (error) {
  app.log.error({ err: error }, 'failed to start')
  process.exit(1)
}
