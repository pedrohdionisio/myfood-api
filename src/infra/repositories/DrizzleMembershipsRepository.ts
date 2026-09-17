import { and, asc, eq } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICreateMembershipData,
  IMembership,
  IMembershipsRepository,
  IMemberWithUser,
  IRestaurantSummary,
  ITeamMember
} from '@/application/interfaces/IMembershipsRepository.js'
import type { ICreateRestaurantUserData } from '@/application/interfaces/IRestaurantUsersRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { restaurantMembers, restaurants, restaurantUsers } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError } from '@/domain/errors.js'
import { violatesUniqueConstraint } from './unique-violation.js'

const DUPLICATE_MEMBERSHIP = 'restaurant_members_restaurant_id_user_id_index'
const DUPLICATE_USER_EMAIL = 'restaurant_users_email_unique'

@injectable()
export class DrizzleMembershipsRepository implements IMembershipsRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async findByUserAndRestaurant(userId: string, restaurantId: string): Promise<IMembership | null> {
    const [row] = await this.database.db
      .select({
        id: restaurantMembers.id,
        restaurantId: restaurantMembers.restaurantId,
        userId: restaurantMembers.userId,
        role: restaurantMembers.role,
        active: restaurantMembers.active,
        restaurantStatus: restaurants.status
      })
      .from(restaurantMembers)
      .innerJoin(restaurants, eq(restaurants.id, restaurantMembers.restaurantId))
      .where(
        and(eq(restaurantMembers.userId, userId), eq(restaurantMembers.restaurantId, restaurantId))
      )
      .limit(1)

    return row ?? null
  }

  async findById(restaurantId: string, id: string): Promise<IMembership | null> {
    const [row] = await this.database.db
      .select({
        id: restaurantMembers.id,
        restaurantId: restaurantMembers.restaurantId,
        userId: restaurantMembers.userId,
        role: restaurantMembers.role,
        active: restaurantMembers.active,
        restaurantStatus: restaurants.status
      })
      .from(restaurantMembers)
      .innerJoin(restaurants, eq(restaurants.id, restaurantMembers.restaurantId))
      .where(and(eq(restaurantMembers.id, id), eq(restaurantMembers.restaurantId, restaurantId)))
      .limit(1)

    return row ?? null
  }

  async listByRestaurant(restaurantId: string): Promise<ITeamMember[]> {
    return this.database.db
      .select({
        id: restaurantMembers.id,
        userId: restaurantMembers.userId,
        name: restaurantUsers.name,
        email: restaurantUsers.email,
        phone: restaurantUsers.phone,
        role: restaurantMembers.role,
        active: restaurantMembers.active
      })
      .from(restaurantMembers)
      .innerJoin(restaurantUsers, eq(restaurantUsers.id, restaurantMembers.userId))
      .where(eq(restaurantMembers.restaurantId, restaurantId))
      .orderBy(asc(restaurantUsers.name))
  }

  async listByUser(userId: string): Promise<IRestaurantSummary[]> {
    return this.database.db
      .select({
        restaurantId: restaurantMembers.restaurantId,
        tradeName: restaurants.tradeName,
        role: restaurantMembers.role,
        restaurantStatus: restaurants.status
      })
      .from(restaurantMembers)
      .innerJoin(restaurants, eq(restaurants.id, restaurantMembers.restaurantId))
      .where(and(eq(restaurantMembers.userId, userId), eq(restaurantMembers.active, true)))
  }

  async create(data: ICreateMembershipData): Promise<IMembership> {
    try {
      const [row] = await this.database.db.insert(restaurantMembers).values(data).returning({
        id: restaurantMembers.id,
        restaurantId: restaurantMembers.restaurantId,
        userId: restaurantMembers.userId,
        role: restaurantMembers.role,
        active: restaurantMembers.active
      })

      if (!row) {
        throw new Error('insert de restaurant_member não retornou linha')
      }

      const [restaurant] = await this.database.db
        .select({ status: restaurants.status })
        .from(restaurants)
        .where(eq(restaurants.id, data.restaurantId))
        .limit(1)

      if (!restaurant) {
        throw new Error(`restaurante ${data.restaurantId} não encontrado após inserir vínculo`)
      }

      return { ...row, restaurantStatus: restaurant.status }
    } catch (error) {
      if (violatesUniqueConstraint(error, DUPLICATE_MEMBERSHIP)) {
        throw new ConflictError(
          `Usuário ${data.userId} já é membro do restaurante ${data.restaurantId}.`,
          'Esta pessoa já faz parte da equipe.'
        )
      }

      throw error
    }
  }

  async createWithNewUser(
    user: ICreateRestaurantUserData,
    membership: Omit<ICreateMembershipData, 'userId'>
  ): Promise<IMemberWithUser> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const [createdUser] = await tx.insert(restaurantUsers).values(user).returning({
          id: restaurantUsers.id,
          cognitoSub: restaurantUsers.cognitoSub,
          name: restaurantUsers.name,
          email: restaurantUsers.email
        })

        if (!createdUser) {
          throw new Error('insert de restaurant_user não retornou linha')
        }

        const [createdMembership] = await tx
          .insert(restaurantMembers)
          .values({
            restaurantId: membership.restaurantId,
            role: membership.role,
            userId: createdUser.id
          })
          .returning({
            id: restaurantMembers.id,
            restaurantId: restaurantMembers.restaurantId,
            userId: restaurantMembers.userId,
            role: restaurantMembers.role,
            active: restaurantMembers.active
          })

        if (!createdMembership) {
          throw new Error('insert de restaurant_member não retornou linha')
        }

        const [restaurant] = await tx
          .select({ status: restaurants.status })
          .from(restaurants)
          .where(eq(restaurants.id, membership.restaurantId))
          .limit(1)

        if (!restaurant) {
          throw new Error(`restaurante ${membership.restaurantId} não encontrado`)
        }

        return {
          user: createdUser,
          membership: { ...createdMembership, restaurantStatus: restaurant.status }
        }
      })
    } catch (error) {
      if (violatesUniqueConstraint(error, DUPLICATE_USER_EMAIL)) {
        throw new ConflictError(
          `E-mail ${user.email} já existe em restaurant_users.`,
          'Este e-mail já está cadastrado.'
        )
      }

      throw error
    }
  }
}
