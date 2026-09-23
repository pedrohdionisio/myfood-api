import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import type { IEventPublisher, IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import type { IAwsCredentials } from '@/config/aws.js'

export class SqsEventPublisher implements IEventPublisher {
  private readonly client: SQSClient

  constructor(
    private readonly queueUrl: string,
    region: string,
    credentials?: IAwsCredentials
  ) {
    this.client = new SQSClient({ region, ...(credentials ? { credentials } : {}) })
  }

  async publish(event: IOutboxEvent): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(event)
      })
    )
  }

  destroy(): void {
    this.client.destroy()
  }
}
