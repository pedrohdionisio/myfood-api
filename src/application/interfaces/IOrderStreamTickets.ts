export interface IOrderStreamTicket {
  ticket: string
  expiresAt: string
}

export interface IOrderStreamTickets {
  /**
   * Emite um ticket de uso único para abrir a conexão do stream de um restaurante. Quem chama já
   * verificou o vínculo: o ticket só carrega a decisão até o handshake do WebSocket, onde o
   * navegador não consegue mandar o Authorization.
   */
  issue(restaurantId: string): Promise<IOrderStreamTicket>
}
