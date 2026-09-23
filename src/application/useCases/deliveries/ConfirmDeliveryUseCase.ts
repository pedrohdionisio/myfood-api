import { inject, injectable } from 'tsyringe'
import type { IMembershipsRepository } from '@/application/interfaces/IMembershipsRepository.js'
import type { IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import type { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { CONFIRMATION_WINDOW_MINUTES, MAX_FAILED_CONFIRMATIONS } from '@/domain/delivery.js'
import { DomainError, NotFoundError, TooManyRequestsError } from '@/domain/errors.js'
import { requireAssignedDriverMemberId } from './resolveDriverMembership.js'

export interface IConfirmDeliveryInput {
  userId: string
  orderId: string
  code: string
}

@injectable()
export class ConfirmDeliveryUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository,
    @inject(TOKENS.MembershipsRepository)
    private readonly memberships: IMembershipsRepository,
    @inject(TOKENS.NotifyOrderChangeUseCase)
    private readonly notify: NotifyOrderChangeUseCase
  ) {}

  async execute(input: IConfirmDeliveryInput): Promise<void> {
    const { userId, orderId, code } = input

    const assignment = await this.orders.findDriverAssignment(orderId)

    if (!assignment) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado.`)
    }

    const memberId = await requireAssignedDriverMemberId(this.memberships, userId, assignment)

    const outcome = await this.orders.confirmDelivery({
      orderId,
      memberId,
      actorId: userId,
      code,
      failuresSince: new Date(Date.now() - CONFIRMATION_WINDOW_MINUTES * 60_000),
      maxFailures: MAX_FAILED_CONFIRMATIONS
    })

    if (outcome === 'BLOCKED') {
      throw new TooManyRequestsError(
        `Pedido ${orderId} atingiu ${MAX_FAILED_CONFIRMATIONS} tentativas falhas em ${CONFIRMATION_WINDOW_MINUTES} minutos.`,
        'Muitas tentativas erradas. Aguarde alguns minutos e confirme de novo.'
      )
    }

    if (outcome === 'WRONG_CODE') {
      throw new DomainError(
        `Confirmação recusada no pedido ${orderId}: código errado ou status diferente de OUT_FOR_DELIVERY.`,
        'Código incorreto. Confira com o cliente e tente novamente.'
      )
    }

    await this.notify.execute({
      change: 'STATUS_CHANGED',
      actor: 'DRIVER',
      order: { ...assignment, status: 'DELIVERED' }
    })
  }
}
