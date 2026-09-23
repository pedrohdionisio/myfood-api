import type { DevicePlatform } from '@/domain/enums.js'

export type PushTokenOwner =
  | { type: 'CUSTOMER'; customerId: string }
  | { type: 'RESTAURANT_USER'; restaurantUserId: string }

export interface IRegisterPushTokenData {
  owner: PushTokenOwner
  token: string
  platform: DevicePlatform
}

export interface IPushTokensRepository {
  /** O token pertence ao aparelho, não à conta: se já existir, passa a apontar para quem entrou. */
  register(data: IRegisterPushTokenData): Promise<void>

  listTokensByCustomer(customerId: string): Promise<string[]>

  /** Resolve o usuário pelo vínculo, porque é o vínculo que o pedido guarda em driver_member_id. */
  listTokensByMember(memberId: string): Promise<string[]>

  deleteByOwnerAndToken(owner: PushTokenOwner, token: string): Promise<void>

  deleteByTokens(tokens: string[]): Promise<void>
}
