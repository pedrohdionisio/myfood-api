import type { APIGatewayProxyResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda'
import type { IRealtimeConnectionStore } from './DynamoRealtimeStore.js'

// O tipo do aws-lambda para eventos de WebSocket omite a query string do $connect.
export type RealtimeConnectionEvent = APIGatewayProxyWebsocketEventV2 & {
  queryStringParameters?: Record<string, string | undefined>
}

export async function handleConnectionEvent(
  store: IRealtimeConnectionStore,
  event: RealtimeConnectionEvent
): Promise<APIGatewayProxyResultV2> {
  const { routeKey, connectionId } = event.requestContext

  if (routeKey === '$connect') {
    const ticket = event.queryStringParameters?.ticket
    const restaurantId = ticket ? await store.consumeTicket(ticket) : null

    // Recusar no $connect é o que impede o handshake: o navegador nem chega a abrir o socket.
    if (!restaurantId) {
      return { statusCode: 401 }
    }

    await store.addConnection(connectionId, restaurantId)
    return { statusCode: 200 }
  }

  if (routeKey === '$disconnect') {
    await store.removeConnection(connectionId)
    return { statusCode: 200 }
  }

  // $default: o ping do dashboard. Só existe para a conexão não cair pelo limite de ociosidade.
  return { statusCode: 200 }
}
