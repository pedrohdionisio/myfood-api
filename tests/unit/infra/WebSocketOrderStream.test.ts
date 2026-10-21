import {
  GoneException,
  type PostToConnectionCommand
} from '@aws-sdk/client-apigatewaymanagementapi'
import { describe, expect, it } from 'vitest'
import type { IOrderStreamEvent } from '@/application/interfaces/IOrderStream.js'
import { WebSocketOrderStream } from '@/infra/realtime/WebSocketOrderStream.js'

const event: IOrderStreamEvent = {
  type: 'ORDER_PLACED',
  orderId: 'o1',
  displayNumber: 7,
  status: 'PENDING',
  occurredAt: '2026-10-20T12:00:00.000Z'
}

function setup(options: { gone?: string[]; failing?: string[] } = {}) {
  const connections = new Map([
    ['c1', 'r1'],
    ['c2', 'r1'],
    ['c3', 'r2']
  ])
  const sent: { connectionId: string; data: unknown }[] = []

  const lookup = {
    listConnections: async (restaurantId: string) =>
      [...connections].filter(([, owner]) => owner === restaurantId).map(([id]) => id),
    removeConnection: async (connectionId: string) => {
      connections.delete(connectionId)
    }
  }
  const client = {
    send: async (command: PostToConnectionCommand) => {
      const connectionId = command.input.ConnectionId ?? ''

      if (options.gone?.includes(connectionId)) {
        throw new GoneException({ message: 'gone', $metadata: {} })
      }
      if (options.failing?.includes(connectionId)) {
        throw new Error('throttled')
      }

      sent.push({
        connectionId,
        data: JSON.parse(Buffer.from(command.input.Data as Uint8Array).toString())
      })
    }
  }

  const stream = new WebSocketOrderStream(lookup, client as never)

  return { stream, sent, connections }
}

describe('WebSocketOrderStream', () => {
  it("should send the event to every connection of the restaurant and no other's", async () => {
    const { stream, sent } = setup()

    await stream.publish('r1', event)

    expect(sent).toEqual([
      { connectionId: 'c1', data: event },
      { connectionId: 'c2', data: event }
    ])
  })

  it('should forget a connection the gateway reports as gone and still reach the others', async () => {
    const { stream, sent, connections } = setup({ gone: ['c1'] })

    await stream.publish('r1', event)

    expect(sent.map(({ connectionId }) => connectionId)).toEqual(['c2'])
    expect(connections.has('c1')).toBe(false)
  })

  it('should never reject, even when a delivery fails', async () => {
    const { stream, connections } = setup({ failing: ['c1', 'c2'] })

    await expect(stream.publish('r1', event)).resolves.toBeUndefined()
    expect(connections.has('c1')).toBe(true)
  })
})
