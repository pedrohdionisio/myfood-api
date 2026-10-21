import { z } from 'zod'
import {
  handleConnectionEvent,
  type RealtimeConnectionEvent
} from '@/infra/realtime/connection-events.js'
import { DynamoRealtimeStore } from '@/infra/realtime/DynamoRealtimeStore.js'

// Não é o env.ts da API: o handshake só consulta o DynamoDB, e não acordar o Neon a cada conexão
// é o motivo de a autorização ter ficado na rota que emite o ticket.
const env = z
  .object({
    AWS_REGION: z.string().min(1),
    REALTIME_CONNECTIONS_TABLE: z.string().min(1),
    REALTIME_TICKETS_TABLE: z.string().min(1)
  })
  .parse(process.env)

const store = new DynamoRealtimeStore(
  { connections: env.REALTIME_CONNECTIONS_TABLE, tickets: env.REALTIME_TICKETS_TABLE },
  env.AWS_REGION
)

export function handler(event: RealtimeConnectionEvent) {
  return handleConnectionEvent(store, event)
}
