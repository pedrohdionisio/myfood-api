export interface IOutboxRelayTrigger {
  /**
   * Pede a publicação dos eventos pendentes sem esperar por ela. Nunca rejeita: o evento já está
   * no outbox, e a varredura periódica publica o que um gatilho perdido deixou para trás.
   */
  wake(): Promise<void>
}
