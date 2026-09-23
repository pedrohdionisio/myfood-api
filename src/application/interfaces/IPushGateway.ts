export interface IPushMessage {
  token: string
  title: string
  body: string
  data: Record<string, string>
}

export interface IPushSendResult {
  /** Tokens que o provedor recusou por não existirem mais: o registro deles é apagado. */
  invalidTokens: string[]
}

export interface IPushGateway {
  /**
   * Nunca rejeita: push é melhor esforço e não pode derrubar a transição que o originou. Falha de
   * rede ou do provedor é registrada pelo adaptador e devolvida como nenhum token inválido.
   */
  send(messages: IPushMessage[]): Promise<IPushSendResult>
}
