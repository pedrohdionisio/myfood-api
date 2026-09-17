import 'reflect-metadata'
import { pino } from 'pino'
import type { ProcessImageVariantsUseCase } from '@/application/useCases/uploads/ProcessImageVariantsUseCase.js'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { SqsQueueConsumer } from '@/infra/queues/SqsQueueConsumer.js'

const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
        }
      }
    : {})
}).child({ worker: 'image-processing' })

interface IS3EventRecord {
  s3?: { object?: { key?: string } }
}

function parseObjectKeys(body: string): string[] {
  const payload = JSON.parse(body) as { Records?: IS3EventRecord[] }

  // Ao criar a notificação o S3 manda um s3:TestEvent, que não tem Records.
  return (payload.Records ?? [])
    .map((record) => record.s3?.object?.key)
    .filter((key): key is string => Boolean(key))
    .map((key) => decodeURIComponent(key.replace(/\+/g, ' ')))
}

const container = buildContainer(env)
const processImageVariants = container.resolve<ProcessImageVariantsUseCase>(
  TOKENS.ProcessImageVariantsUseCase
)

const consumer = new SqsQueueConsumer(
  env.SQS_IMAGE_PROCESSING_URL,
  env.AWS_REGION,
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
    : undefined
)

const controller = new AbortController()

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    logger.info({ signal }, 'shutting down')
    controller.abort()
  })
}

logger.info({ queue: env.SQS_IMAGE_PROCESSING_URL }, 'waiting for image uploads')

try {
  await consumer.consume({
    signal: controller.signal,
    onError: (error, messageId) => logger.error({ err: error, messageId }, 'message failed'),
    handler: async (body) => {
      for (const objectKey of parseObjectKeys(body)) {
        const result = await processImageVariants.execute(objectKey)

        if (!result) {
          logger.warn({ objectKey }, 'object is not a processable original, ignoring')
          continue
        }

        logger.info({ imageKey: result.imageKey, variants: result.variantKeys.length }, 'processed')
      }
    }
  })
} catch (error) {
  if (!controller.signal.aborted) {
    logger.error({ err: error }, 'consumer stopped')
    process.exitCode = 1
  }
}

consumer.destroy()
await container.resolve<IDatabaseConnection>(TOKENS.Database).close()
