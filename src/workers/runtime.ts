import { setTimeout } from 'node:timers/promises'
import { type Logger, pino } from 'pino'
import type { Env } from '@/config/env.js'
import { buildLoggerOptions } from '@/config/logger.js'

export function createWorkerLogger(env: Env, name: string): Logger {
  return pino(buildLoggerOptions(env)).child({ worker: name })
}

export function shutdownSignal(logger: Logger): AbortSignal {
  const controller = new AbortController()

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      logger.info({ signal }, 'shutting down')
      controller.abort()
    })
  }

  return controller.signal
}

// Termina antes do prazo quando o worker recebe o sinal de parada, em vez de rejeitar.
export async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  await setTimeout(ms, undefined, { signal }).catch(() => undefined)
}
