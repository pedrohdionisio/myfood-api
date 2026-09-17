import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs'

export interface ISqsCredentials {
  accessKeyId: string
  secretAccessKey: string
}

export interface IConsumeParams {
  handler: (body: string) => Promise<void>
  onError: (error: unknown, messageId: string) => void
  signal: AbortSignal
}

const WAIT_TIME_SECONDS = 20
const MAX_MESSAGES = 10

export class SqsQueueConsumer {
  private readonly client: SQSClient

  constructor(
    private readonly queueUrl: string,
    region: string,
    credentials?: ISqsCredentials
  ) {
    this.client = new SQSClient({ region, ...(credentials ? { credentials } : {}) })
  }

  async consume(params: IConsumeParams): Promise<void> {
    const { handler, onError, signal } = params

    while (!signal.aborted) {
      const received = await this.client.send(
        new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: MAX_MESSAGES,
          WaitTimeSeconds: WAIT_TIME_SECONDS
        }),
        { abortSignal: signal }
      )

      for (const message of received.Messages ?? []) {
        if (!message.Body || !message.ReceiptHandle) {
          continue
        }

        try {
          await handler(message.Body)

          await this.client.send(
            new DeleteMessageCommand({
              QueueUrl: this.queueUrl,
              ReceiptHandle: message.ReceiptHandle
            })
          )
        } catch (error) {
          // A mensagem não é apagada: volta para a fila quando o visibility timeout expira
          // e, depois de maxReceiveCount, o próprio SQS a manda para a DLQ.
          onError(error, message.MessageId ?? 'unknown')
        }
      }
    }
  }

  destroy(): void {
    this.client.destroy()
  }
}
