import { existsSync } from 'node:fs'
import { z } from 'zod'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().max(65535).default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  AWS_REGION: z.string().min(1),
  COGNITO_CUSTOMER_POOL_ID: z.string().min(1),
  COGNITO_CUSTOMER_CLIENT_ID: z.string().min(1),
  COGNITO_RESTAURANT_POOL_ID: z.string().min(1),
  COGNITO_RESTAURANT_CLIENT_ID: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  SQS_IMAGE_PROCESSING_URL: z.url(),
  SQS_ORDER_EVENTS_URL: z.url(),

  // A troca por um domínio de CDN é aqui: o resto do código só conhece esta base.
  MEDIA_BASE_URL: z.url().optional(),

  // Opcionais: sem elas o SDK resolve pela cadeia padrão (~/.aws/credentials, IAM role).
  // No container não há ~/.aws, então lá elas precisam vir do .env.
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional()
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  process.stderr.write(`Invalid environment:\n${z.prettifyError(parsed.error)}\n`)
  process.exit(1)
}

export const env = {
  ...parsed.data,
  MEDIA_BASE_URL:
    parsed.data.MEDIA_BASE_URL ??
    `https://${parsed.data.S3_BUCKET}.s3.${parsed.data.AWS_REGION}.amazonaws.com`
}

export type Env = typeof env
