import { eq } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  IAuthenticatedRestaurantUser,
  ICreateRestaurantUserData,
  IRestaurantUsersRepository,
  IUpdateRestaurantUserProfileData
} from '@/application/interfaces/IRestaurantUsersRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { restaurantUsers } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'

const SELECTION = {
  id: restaurantUsers.id,
  cognitoSub: restaurantUsers.cognitoSub,
  name: restaurantUsers.name,
  email: restaurantUsers.email,
  phone: restaurantUsers.phone
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

  async updateProfile(
    id: string,
    data: IUpdateRestaurantUserProfileData
  ): Promise<IAuthenticatedRestaurantUser> {
    const [row] = await this.database.db
      .update(restaurantUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(restaurantUsers.id, id))
      .returning(SELECTION)

    if (!row) {
      throw new NotFoundError(`Usuário ${id} não encontrado em restaurantUsers.`)
    }

    return row
  }

  async create(data: ICreateRestaurantUserData): Promise<IAuthenticatedRestaurantUser> {
    const [row] = await this.database.db.insert(restaurantUsers).values(data).returning(SELECTION)

    if (!row) {
      throw new Error('insert de restaurant_user não retornou linha')
    }

    return row
  }
}
