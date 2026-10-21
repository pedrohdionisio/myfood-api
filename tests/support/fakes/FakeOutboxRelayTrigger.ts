import type { IOutboxRelayTrigger } from '@/application/interfaces/IOutboxRelayTrigger.js'

export class FakeOutboxRelayTrigger implements IOutboxRelayTrigger {
  wakes = 0

  reset(): void {
    this.wakes = 0
  }

  async wake(): Promise<void> {
    this.wakes += 1
  }
}
