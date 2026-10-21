import { randomBytes } from 'node:crypto'
import {
  type AttributeValue,
  ConditionalCheckFailedException,
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand
} from '@aws-sdk/client-dynamodb'
import type {
  IOrderStreamTicket,
  IOrderStreamTickets
} from '@/application/interfaces/IOrderStreamTickets.js'

const TICKET_TTL_SECONDS = 60
// O API Gateway encerra toda conexão WebSocket em 2h. A folga cobre o $disconnect que não chega.
const CONNECTION_TTL_SECONDS = 2 * 60 * 60 + 10 * 60
export const CONNECTIONS_BY_RESTAURANT_INDEX = 'by-restaurant'

export interface IRealtimeTables {
  connections: string
  tickets: string
}

export interface IRealtimeConnectionStore {
  /** Devolve o restaurante do ticket e o invalida; null se não existe, já foi usado ou venceu. */
  consumeTicket(ticket: string): Promise<string | null>
  addConnection(connectionId: string, restaurantId: string): Promise<void>
  removeConnection(connectionId: string): Promise<void>
}

export interface IRealtimeConnectionLookup {
  listConnections(restaurantId: string): Promise<string[]>
  removeConnection(connectionId: string): Promise<void>
}

function epochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export class DynamoRealtimeStore
  implements IOrderStreamTickets, IRealtimeConnectionStore, IRealtimeConnectionLookup
{
  private readonly client: DynamoDBClient

  constructor(
    private readonly tables: IRealtimeTables,
    region: string
  ) {
    this.client = new DynamoDBClient({ region })
  }

  async issue(restaurantId: string): Promise<IOrderStreamTicket> {
    const ticket = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + TICKET_TTL_SECONDS * 1000)

    await this.client.send(
      new PutItemCommand({
        TableName: this.tables.tickets,
        Item: {
          ticket: { S: ticket },
          restaurantId: { S: restaurantId },
          expiresAt: { N: String(epochSeconds(expiresAt)) }
        }
      })
    )

    return { ticket, expiresAt: expiresAt.toISOString() }
  }

  async consumeTicket(ticket: string): Promise<string | null> {
    try {
      // Apagar com condição é o que torna o ticket de uso único: dois handshakes com o mesmo
      // ticket não passam os dois. A checagem do prazo é aqui porque o TTL do DynamoDB só apaga o
      // item horas depois de vencido.
      const { Attributes } = await this.client.send(
        new DeleteItemCommand({
          TableName: this.tables.tickets,
          Key: { ticket: { S: ticket } },
          ConditionExpression: 'attribute_exists(ticket) AND expiresAt > :now',
          ExpressionAttributeValues: { ':now': { N: String(epochSeconds(new Date())) } },
          ReturnValues: 'ALL_OLD'
        })
      )

      return Attributes?.restaurantId?.S ?? null
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return null
      }

      throw error
    }
  }

  async addConnection(connectionId: string, restaurantId: string): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.tables.connections,
        Item: {
          connectionId: { S: connectionId },
          restaurantId: { S: restaurantId },
          expiresAt: { N: String(epochSeconds(new Date()) + CONNECTION_TTL_SECONDS) }
        }
      })
    )
  }

  async removeConnection(connectionId: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tables.connections,
        Key: { connectionId: { S: connectionId } }
      })
    )
  }

  async listConnections(restaurantId: string): Promise<string[]> {
    const connectionIds: string[] = []
    let startKey: Record<string, AttributeValue> | undefined

    do {
      const page = await this.client.send(
        new QueryCommand({
          TableName: this.tables.connections,
          IndexName: CONNECTIONS_BY_RESTAURANT_INDEX,
          KeyConditionExpression: 'restaurantId = :restaurantId',
          ExpressionAttributeValues: { ':restaurantId': { S: restaurantId } },
          ProjectionExpression: 'connectionId',
          ...(startKey ? { ExclusiveStartKey: startKey } : {})
        })
      )

      for (const item of page.Items ?? []) {
        if (item.connectionId?.S) {
          connectionIds.push(item.connectionId.S)
        }
      }

      startKey = page.LastEvaluatedKey
    } while (startKey)

    return connectionIds
  }
}
