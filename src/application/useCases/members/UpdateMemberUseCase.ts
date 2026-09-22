import { inject, injectable } from 'tsyringe'
import type {
  IMembershipsRepository,
  ITeamMember,
  IUpdateMembershipData
} from '@/application/interfaces/IMembershipsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { ForbiddenError, NotFoundError } from '@/domain/errors.js'

export interface IUpdateMemberInput extends IUpdateMembershipData {
  restaurantId: string
  memberId: string
  actorMembershipId: string
}

@injectable()
export class UpdateMemberUseCase {
  constructor(
    @inject(TOKENS.MembershipsRepository)
    private readonly memberships: IMembershipsRepository
  ) {}

  async execute(input: IUpdateMemberInput): Promise<ITeamMember> {
    const { restaurantId, memberId, actorMembershipId, role, active } = input

    // Recusar o próprio vínculo é o que garante que sempre sobra um OWNER ativo: quem chega aqui
    // já passou pelo requireMembership('OWNER'), e não pode se rebaixar nem se desativar. Dois
    // donos podem se desativar um ao outro, mas nunca ao mesmo tempo o último dos dois.
    if (memberId === actorMembershipId) {
      throw new ForbiddenError(
        `Membro ${memberId} tentou alterar o próprio vínculo.`,
        'Você não pode alterar o seu próprio acesso. Peça a outro dono.'
      )
    }

    const member = await this.memberships.update(restaurantId, memberId, { role, active })

    if (!member) {
      throw new NotFoundError(
        `Membro ${memberId} não encontrado no restaurante ${restaurantId}.`,
        'Esta pessoa não faz parte da equipe.'
      )
    }

    return member
  }
}
