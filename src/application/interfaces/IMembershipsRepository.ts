import type { MemberRole, RestaurantStatus } from '@/domain/enums.js'
import type {
  IAuthenticatedRestaurantUser,
  ICreateRestaurantUserData
} from './IRestaurantUsersRepository.js'

export type { MemberRole }

export interface IMembership {
  id: string
  restaurantId: string
  userId: string
  role: MemberRole
  active: boolean
  restaurantStatus: RestaurantStatus
}

export interface IRestaurantSummary {
  restaurantId: string
  tradeName: string
  role: MemberRole
  restaurantStatus: RestaurantStatus
}

export interface ICreateMembershipData {
  restaurantId: string
  userId: string
  role: MemberRole
}

export interface IMemberWithUser {
  membership: IMembership
  user: IAuthenticatedRestaurantUser
}

export interface ITeamMember {
  id: string
  userId: string
  name: string
  email: string
  phone: string | null
  role: MemberRole
  active: boolean
}

export interface IMembershipsRepository {
  findByUserAndRestaurant(userId: string, restaurantId: string): Promise<IMembership | null>

  findById(restaurantId: string, id: string): Promise<IMembership | null>

  listByRestaurant(restaurantId: string): Promise<ITeamMember[]>

  listActiveByUser(userId: string): Promise<IMembership[]>

  listByUser(userId: string): Promise<IRestaurantSummary[]>

  create(data: ICreateMembershipData): Promise<IMembership>

  /**
   * Cria o usuário de restaurante e o vínculo na mesma transação. As duas linhas são uma
   * operação só do ponto de vista do negócio: usuário sem vínculo não consegue fazer nada.
   */
  createWithNewUser(
    user: ICreateRestaurantUserData,
    membership: Omit<ICreateMembershipData, 'userId'>
  ): Promise<IMemberWithUser>
}
