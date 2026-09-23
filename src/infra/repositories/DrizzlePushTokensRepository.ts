import { and, eq, inArray } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  IPushTokensRepository,
  IRegisterPushTokenData,
  PushTokenOwner
} from '@/application/interfaces/IPushTokensRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { pushTokens, restaurantMembers } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { uuidv7 } from '@/shared/uuid.js'

// As duas colunas são sempre escritas juntas: é o que zera o dono anterior quando o aparelho troca
// de perfil, e o CHECK push_tokens_single_owner recusa qualquer outra combinação.
function ownerColumns(owner: PushTokenOwner) {
  return owner.type === 'CUSTOMER'
    ? { customerId: owner.customerId, restaurantUserId: null }
    : { customerId: null, restaurantUserId: owner.restaurantUserId }
}

function ownerCondition(owner: PushTokenOwner) {
  return owner.type === 'CUSTOMER'
    ? eq(pushTokens.customerId, owner.customerId)
    : eq(pushTokens.restaurantUserId, owner.restaurantUserId)
}

@injectable()
export class DrizzlePushTokensRepository implements IPushTokensRepository {
  constructor(
    @inject(TOKENS.Database)
    private readonly database: IDatabaseConnection
  ) {}

  async register(data: IRegisterPushTokenData): Promise<void> {
    const owner = ownerColumns(data.owner)

    await this.database.db
      .insert(pushTokens)
      .values({
        id: uuidv7(),
        ...owner,
        token: data.token,
        platform: data.platform
      })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: {
          ...owner,
          platform: data.platform,
          lastSeenAt: new Date()
        }
      })
  }

  async listTokensByCustomer(customerId: string): Promise<string[]> {
    const rows = await this.database.db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.customerId, customerId))

    return rows.map((row) => row.token)
  }

  async listTokensByMember(memberId: string): Promise<string[]> {
    const rows = await this.database.db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .innerJoin(restaurantMembers, eq(restaurantMembers.userId, pushTokens.restaurantUserId))
      .where(eq(restaurantMembers.id, memberId))

    return rows.map((row) => row.token)
  }

  async deleteByOwnerAndToken(owner: PushTokenOwner, token: string): Promise<void> {
    await this.database.db
      .delete(pushTokens)
      .where(and(ownerCondition(owner), eq(pushTokens.token, token)))
  }

  async deleteByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return
    }

    await this.database.db.delete(pushTokens).where(inArray(pushTokens.token, tokens))
  }
}
