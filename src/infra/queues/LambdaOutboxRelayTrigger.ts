import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { pino } from 'pino'
import type { IOutboxRelayTrigger } from '@/application/interfaces/IOutboxRelayTrigger.js'

const logger = pino().child({ gateway: 'outbox-relay-trigger' })

export class LambdaOutboxRelayTrigger implements IOutboxRelayTrigger {
  private readonly client: LambdaClient

  constructor(
    private readonly functionName: string,
    region: string
  ) {
    this.client = new LambdaClient({ region })
  }

  async wake(): Promise<void> {
    try {
      // Event = invocação assíncrona: a AWS enfileira e responde na hora, sem esperar o relay.
      await this.client.send(
        new InvokeCommand({ FunctionName: this.functionName, InvocationType: 'Event' })
      )
    } catch (error) {
      logger.error({ err: error, functionName: this.functionName }, 'outbox relay wake failed')
    }
  }
}
