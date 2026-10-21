export interface IChargeExpiryScheduler {
  /**
   * Agenda o acerto da cobrança para quando ela vencer. Nunca rejeita: a cobrança já foi criada,
   * e a varredura periódica acerta a que ficar sem agendamento, só que mais tarde.
   */
  scheduleExpiry(chargeId: string, expiresAt: string): Promise<void>
}
