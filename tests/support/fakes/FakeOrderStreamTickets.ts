import type {
  IOrderStreamTicket,
  IOrderStreamTickets
} from '@/application/interfaces/IOrderStreamTickets.js'

export class FakeOrderStreamTickets implements IOrderStreamTickets {
  readonly issued = new Map<string, string>()

  reset(): void {
    this.issued.clear()
  }

  async issue(restaurantId: string): Promise<IOrderStreamTicket> {
    const ticket = `ticket-${this.issued.size + 1}`
    this.issued.set(ticket, restaurantId)

    return { ticket, expiresAt: new Date(Date.now() + 60_000).toISOString() }
  }
}
