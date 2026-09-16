import { eq } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  IAuthenticatedRestaurantUser,
  ICreateRestaurantUserData,
  IRestaurantUsersRepository
} from '@/application/interfaces/IRestaurantUsersRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { restaurantUsers } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'

const SELECTION = {
  id: restaurantUsers.id,
  cognitoSub: restaurantUsers.cognitoSub,
  name: restaurantUsers.name,
  email: restaurantUsers.email
}

@injectable()
export class DrizzleRestaurantUsersRepository implements IRestaurantUsersRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async findByCognitoSub(cognitoSub: string): Promise<IAuthenticatedRestaurantUser | null> {
    const [row] = await this.database.db
      .select(SELECTION)
      .from(restaurantUsers)
      .where(eq(restaurantUsers.cognitoSub, cognitoSub))
      .limit(1)

    return row ?? null
  }

  async findByEmail(email: string): Promise<IAuthenticatedRestaurantUser | null> {
    const [row] = await this.database.db
      .select(SELECTION)
      .from(restaurantUsers)
      .where(eq(restaurantUsers.email, email))
      .limit(1)

    return row ?? null
  }

  async create(data: ICreateRestaurantUserData): Promise<IAuthenticatedRestaurantUser> {
    const [row] = await this.database.db.insert(restaurantUsers).values(data).returning(SELECTION)

    if (!row) {
      throw new Error('insert de restaurant_user não retornou linha')
    }

    return row
  }
}
