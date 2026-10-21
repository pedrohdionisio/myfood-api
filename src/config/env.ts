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

  // Lambdas do stage: a API acorda o relay do outbox depois do commit e agenda, no EventBridge
  // Scheduler, o acerto de cada cobrança Pix para quando ela vencer.
  OUTBOX_RELAY_FUNCTION_NAME: z.string().min(1),
  SETTLE_CHARGES_FUNCTION_ARN: z.string().startsWith('arn:aws:lambda:'),
  CHARGE_EXPIRY_SCHEDULER_ROLE_ARN: z.string().startsWith('arn:aws:iam::'),

  // Tempo real (D23): o dashboard conecta em REALTIME_URL com um ticket emitido pela API, e a API
  // publica pela URL de callback do mesmo API Gateway WebSocket.
  REALTIME_URL: z.url({ protocol: /^wss$/ }),
  REALTIME_CALLBACK_URL: z.url({ protocol: /^https$/ }),
  REALTIME_CONNECTIONS_TABLE: z.string().min(1),
  REALTIME_TICKETS_TABLE: z.string().min(1),

  // A troca por um domínio de CDN é aqui: o resto do código só conhece esta base.
  MEDIA_BASE_URL: z.url().optional(),

  ABACATEPAY_API_URL: z.url().default('https://api.abacatepay.com/v2'),
  ABACATEPAY_API_KEY: z.string().min(1),
  // O mesmo valor cadastrado no webhook do dashboard: chega como query param em cada entrega.
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(16),
  PAYMENT_PIX_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).max(86_400).default(1800),

  // Só é exigido pelo Expo quando a conta liga o modo de segurança reforçada no envio de push.
  EXPO_ACCESS_TOKEN: z.string().min(1).optional()
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
