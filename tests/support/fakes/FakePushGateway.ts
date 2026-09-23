import type {
  IPushGateway,
  IPushMessage,
  IPushSendResult
} from '@/application/interfaces/IPushGateway.js'

export class FakePushGateway implements IPushGateway {
  readonly sent: IPushMessage[] = []
  readonly invalidTokens = new Set<string>()

  reset(): void {
    this.sent.length = 0
    this.invalidTokens.clear()
  }

  async send(messages: IPushMessage[]): Promise<IPushSendResult> {
    this.sent.push(...messages)

    return {
      invalidTokens: messages
        .map((message) => message.token)
        .filter((token) => this.invalidTokens.has(token))
    }
  }
}
