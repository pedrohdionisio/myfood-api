import type { DevicePlatform } from '@/domain/enums.js'

export interface IRegisterPushTokenData {
  customerId: string
  token: string
  platform: DevicePlatform
}

export interface IPushTokensRepository {
  /** O token pertence ao aparelho, não à conta: se já existir, passa a apontar para quem entrou. */
  register(data: IRegisterPushTokenData): Promise<void>

  listTokensByCustomer(customerId: string): Promise<string[]>

  deleteByCustomerAndToken(customerId: string, token: string): Promise<void>

  deleteByTokens(tokens: string[]): Promise<void>
}
