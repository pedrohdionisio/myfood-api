import { inject, injectable } from 'tsyringe'
import type { IOrderStreamTickets } from '@/application/interfaces/IOrderStreamTickets.js'
import { TOKENS } from '@/di/tokens.js'

export interface IOrderStreamConnection {
  url: string
  ticket: string
  expiresAt: string
}

@injectable()
export class IssueOrderStreamTicketUseCase {
  constructor(
    @inject(TOKENS.OrderStreamTickets) private readonly tickets: IOrderStreamTickets,
    @inject(TOKENS.RealtimeUrl) private readonly realtimeUrl: string
  ) {}

  async execute(restaurantId: string): Promise<IOrderStreamConnection> {
    const { ticket, expiresAt } = await this.tickets.issue(restaurantId)

    return { url: this.realtimeUrl, ticket, expiresAt }
  }
}
