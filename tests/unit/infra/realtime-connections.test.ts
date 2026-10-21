import { describe, expect, it } from 'vitest'
import {
  handleConnectionEvent,
  type RealtimeConnectionEvent
} from '@/infra/realtime/connection-events.js'
import type { IRealtimeConnectionStore } from '@/infra/realtime/DynamoRealtimeStore.js'

class InMemoryConnectionStore implements IRealtimeConnectionStore {
  readonly tickets = new Map<string, string>()
  readonly connections = new Map<string, string>()

  async consumeTicket(ticket: string): Promise<string | null> {
    const restaurantId = this.tickets.get(ticket) ?? null
    this.tickets.delete(ticket)
    return restaurantId
  }

  async addConnection(connectionId: string, restaurantId: string): Promise<void> {
    this.connections.set(connectionId, restaurantId)
  }

  async removeConnection(connectionId: string): Promise<void> {
    this.connections.delete(connectionId)
  }
}

function event(
  routeKey: string,
  connectionId: string,
  query?: Record<string, string>
): RealtimeConnectionEvent {
  return {
    requestContext: { routeKey, connectionId },
    ...(query ? { queryStringParameters: query } : {})
  } as RealtimeConnectionEvent
}

describe('realtime connection events', () => {
  it('should register the connection under the restaurant of a valid ticket, once', async () => {
    const store = new InMemoryConnectionStore()
    store.tickets.set('t1', 'r1')

    const first = await handleConnectionEvent(store, event('$connect', 'c1', { ticket: 't1' }))
    const replay = await handleConnectionEvent(store, event('$connect', 'c2', { ticket: 't1' }))

    expect(first).toEqual({ statusCode: 200 })
    expect(replay).toEqual({ statusCode: 401 })
    expect([...store.connections]).toEqual([['c1', 'r1']])
  })

  it('should refuse a handshake without a ticket or with an unknown one', async () => {
    const store = new InMemoryConnectionStore()

    const missing = await handleConnectionEvent(store, event('$connect', 'c1'))
    const unknown = await handleConnectionEvent(store, event('$connect', 'c2', { ticket: 'nope' }))

    expect(missing).toEqual({ statusCode: 401 })
    expect(unknown).toEqual({ statusCode: 401 })
    expect(store.connections.size).toBe(0)
  })

  it('should forget the connection on disconnect and accept pings', async () => {
    const store = new InMemoryConnectionStore()
    store.connections.set('c1', 'r1')

    const ping = await handleConnectionEvent(store, event('$default', 'c1'))
    const disconnect = await handleConnectionEvent(store, event('$disconnect', 'c1'))

    expect(ping).toEqual({ statusCode: 200 })
    expect(disconnect).toEqual({ statusCode: 200 })
    expect(store.connections.size).toBe(0)
  })
})
