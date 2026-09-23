import { and, eq, inArray } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  IPushTokensRepository,
  IRegisterPushTokenData
} from '@/application/interfaces/IPushTokensRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { pushTokens } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { uuidv7 } from '@/shared/uuid.js'

@injectable()
export class DrizzlePushTokensRepository implements IPushTokensRepository {
  constructor(
    @inject(TOKENS.Database)
    private readonly database: IDatabaseConnection
  ) {}

  async register(data: IRegisterPushTokenData): Promise<void> {
    await this.database.db
      .insert(pushTokens)
      .values({
        id: uuidv7(),
        customerId: data.customerId,
        token: data.token,
        platform: data.platform
      })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: {
          customerId: data.customerId,
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

  async deleteByCustomerAndToken(customerId: string, token: string): Promise<void> {
    await this.database.db
      .delete(pushTokens)
      .where(and(eq(pushTokens.customerId, customerId), eq(pushTokens.token, token)))
  }

  async deleteByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return
    }

    await this.database.db.delete(pushTokens).where(inArray(pushTokens.token, tokens))
  }
}
