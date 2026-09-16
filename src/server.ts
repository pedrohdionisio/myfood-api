import { buildApp } from '@/app.js'
import { env } from '@/config/env.js'

const app = await buildApp()

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down')
    app
      .close()
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
