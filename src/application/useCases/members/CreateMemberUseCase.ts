import { inject, injectable } from 'tsyringe'
import type { IAuthGateway } from '@/application/interfaces/IAuthGateway.js'
import type {
  IMembershipsRepository,
  IMemberWithUser
} from '@/application/interfaces/IMembershipsRepository.js'
import type { IRestaurantUsersRepository } from '@/application/interfaces/IRestaurantUsersRepository.js'
import { TOKENS } from '@/di/tokens.js'
import type { MemberRole } from '@/domain/enums.js'

export interface ICreateMemberInput {
  name: string
  email: string
  password: string
  role: MemberRole
  phone?: string | undefined
}

@injectable()
export class CreateMemberUseCase {
  constructor(
    @inject(TOKENS.MembershipsRepository) private readonly memberships: IMembershipsRepository,
    @inject(TOKENS.RestaurantUsersRepository)
    private readonly users: IRestaurantUsersRepository,
    @inject(TOKENS.RestaurantAuthGateway) private readonly authGateway: IAuthGateway
  ) {}

  async execute(restaurantId: string, input: ICreateMemberInput): Promise<IMemberWithUser> {
    const { name, email, password, role, phone } = input

    // Entregador pode trabalhar em mais de um restaurante: se a conta já existe, o que falta
    // é só o vínculo. Criar de novo no Cognito daria UsernameExists e travaria o caso legítimo.
    const existing = await this.users.findByEmail(email)

    if (existing) {
      const membership = await this.memberships.create({
        restaurantId,
        userId: existing.id,
        role
      })

      return { membership, user: existing }
    }

    const { cognitoSub } = await this.authGateway.createUser({ email, name, password })

    try {
      return await this.memberships.createWithNewUser(
        { cognitoSub, name, email, phone },
        { restaurantId, role }
      )
    } catch (error) {
      await this.authGateway.deleteUser(email)

      throw error
    }
  }
}
