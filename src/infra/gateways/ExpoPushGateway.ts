import { pino } from 'pino'
import type {
  IPushGateway,
  IPushMessage,
  IPushSendResult
} from '@/application/interfaces/IPushGateway.js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const MAX_MESSAGES_PER_REQUEST = 100
const REQUEST_TIMEOUT_MS = 5_000

interface ITicket {
  status: 'ok' | 'error'
  message?: string
  details?: { error?: string }
}

const logger = pino().child({ gateway: 'expo-push' })

function chunk(messages: IPushMessage[]): IPushMessage[][] {
  const chunks: IPushMessage[][] = []

  for (let index = 0; index < messages.length; index += MAX_MESSAGES_PER_REQUEST) {
    chunks.push(messages.slice(index, index + MAX_MESSAGES_PER_REQUEST))
  }

  return chunks
}

export class ExpoPushGateway implements IPushGateway {
  constructor(private readonly accessToken: string | undefined) {}

  async send(messages: IPushMessage[]): Promise<IPushSendResult> {
    const invalidTokens: string[] = []

    for (const batch of chunk(messages)) {
      invalidTokens.push(...(await this.sendBatch(batch)))
    }

    return { invalidTokens }
  }

  private async sendBatch(batch: IPushMessage[]): Promise<string[]> {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {})
        },
        body: JSON.stringify(
          batch.map((message) => ({
            to: message.token,
            title: message.title,
            body: message.body,
            data: message.data,
            sound: 'default'
          }))
        ),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })

      if (!response.ok) {
        logger.error(
          { status: response.status, body: await response.text() },
          'expo recusou o lote'
        )

        return []
      }

      const payload = (await response.json()) as { data?: ITicket[] }

      return this.collectInvalidTokens(batch, payload.data ?? [])
    } catch (error) {
      logger.error({ err: error }, 'envio de push falhou')

      return []
    }
  }

  private collectInvalidTokens(batch: IPushMessage[], tickets: ITicket[]): string[] {
    const invalidTokens: string[] = []

    tickets.forEach((ticket, index) => {
      if (ticket.status !== 'error') {
        return
      }

      const message = batch[index]

      logger.warn({ error: ticket.details?.error, message: ticket.message }, 'push recusado')

      if (message && ticket.details?.error === 'DeviceNotRegistered') {
        invalidTokens.push(message.token)
      }
    })

    return invalidTokens
  }
}
