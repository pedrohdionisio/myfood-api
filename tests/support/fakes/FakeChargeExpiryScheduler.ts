import type { IChargeExpiryScheduler } from '@/application/interfaces/IChargeExpiryScheduler.js'

export class FakeChargeExpiryScheduler implements IChargeExpiryScheduler {
  readonly scheduled: { chargeId: string; expiresAt: string }[] = []

  reset(): void {
    this.scheduled.length = 0
  }

  async scheduleExpiry(chargeId: string, expiresAt: string): Promise<void> {
    this.scheduled.push({ chargeId, expiresAt })
  }
}
