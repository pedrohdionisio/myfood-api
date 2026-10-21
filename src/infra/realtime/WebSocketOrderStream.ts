import {
  type ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand
} from '@aws-sdk/client-apigatewaymanagementapi'
import { pino } from 'pino'
import type { IOrderStream, IOrderStreamEvent } from '@/application/interfaces/IOrderStream.js'
import type { IRealtimeConnectionLookup } from './DynamoRealtimeStore.js'

const logger = pino().child({ gateway: 'websocket-order-stream' })

export class WebSocketOrderStream implements IOrderStream {
  constructor(
    private readonly connections: IRealtimeConnectionLookup,
    private readonly client: Pick<ApiGatewayManagementApiClient, 'send'>
  ) {}

  async publish(restaurantId: string, event: IOrderStreamEvent): Promise<void> {
    try {
      const connectionIds = await this.connections.listConnections(restaurantId)
      const data = Buffer.from(JSON.stringify(event))

      await Promise.all(connectionIds.map((connectionId) => this.send(connectionId, data)))
    } catch (error) {
      logger.error({ err: error, restaurantId, orderId: event.orderId }, 'order stream failed')
    }
  }

  private async send(connectionId: string, data: Buffer): Promise<void> {
    try {
      await this.client.send(
        new PostToConnectionCommand({ ConnectionId: connectionId, Data: data })
      )
    } catch (error) {
      // 410: o dashboard já foi embora sem o $disconnect chegar (aba fechada, rede caída).
      if (error instanceof GoneException) {
        await this.connections.removeConnection(connectionId)
        return
      }

      logger.error({ err: error, connectionId }, 'order stream delivery failed')
    }
  }
}
