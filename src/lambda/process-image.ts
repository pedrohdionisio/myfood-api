// O tsyringe lê metadata no @injectable() do use case, mesmo quando ele é instanciado à mão
// aqui em vez de resolvido pelo container. Sem este import a Lambda quebra no carregamento.
import 'reflect-metadata'
import type { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda'
import { pino } from 'pino'
import { z } from 'zod'
import { ProcessImageVariantsUseCase } from '@/application/useCases/uploads/ProcessImageVariantsUseCase.js'
import { S3StorageGateway } from '@/infra/gateways/S3StorageGateway.js'
import { SharpImageProcessor } from '@/infra/gateways/SharpImageProcessor.js'
import { parseObjectKeys } from '@/infra/queues/s3-notification.js'

// Não é o env.ts da API: este caminho não toca o banco nem o Cognito, e a role da Lambda
// entrega as credenciais. Exigir DATABASE_URL aqui só daria um boot quebrado.
const env = z
  .object({
    AWS_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
  })
  .parse(process.env)

const logger = pino({ level: env.LOG_LEVEL }).child({ lambda: 'process-image' })

// Fora do handler: a Lambda reaproveita o processo entre invocações, então o cliente do S3 e
// o sharp só pagam a inicialização no cold start.
const processImageVariants = new ProcessImageVariantsUseCase(
  new S3StorageGateway(env.S3_BUCKET, env.AWS_REGION),
  new SharpImageProcessor()
)

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchItemFailure[] = []

  for (const record of event.Records) {
    try {
      for (const objectKey of parseObjectKeys(record.body)) {
        const result = await processImageVariants.execute(objectKey)

        if (!result) {
          logger.warn({ objectKey }, 'object is not a processable original, ignoring')
          continue
        }

        logger.info({ imageKey: result.imageKey, variants: result.variantKeys.length }, 'processed')
      }
    } catch (error) {
      // Só esta mensagem volta para a fila; as outras do lote seguem apagadas. Quem habilita
      // isso é o functionResponseType no serverless.yml — sem ele o lote inteiro volta.
      logger.error({ err: error, messageId: record.messageId }, 'message failed')
      batchItemFailures.push({ itemIdentifier: record.messageId })
    }
  }

  return { batchItemFailures }
}
