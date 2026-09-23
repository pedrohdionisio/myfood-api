import type { LoggerOptions } from 'pino'
import type { Env } from './env.js'

// delivery_code nunca pode ser logado. O Pino não tem wildcard recursivo,
// então os níveis de aninhamento são escritos um a um.
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'deliveryCode',
  'delivery_code',
  '*.deliveryCode',
  '*.delivery_code',
  '*.*.deliveryCode',
  '*.*.delivery_code'
]

export function buildLoggerOptions(env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
    ...(env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
          }
        }
      : {})
  }
}
