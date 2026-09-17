import { inject, injectable } from 'tsyringe'
import type { IMembershipsRepository } from '@/application/interfaces/IMembershipsRepository.js'
import type { IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'
import { assertCanTransition, timestampFieldsFor } from '@/domain/order-status.js'
import { requireAssignedDriverMemberId } from './resolveDriverMembership.js'

export interface IFailDeliveryInput {
  userId: string
  orderId: string
  reason?: string | undefined
}

@injectable()
export class FailDeliveryUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository,
    @inject(TOKENS.MembershipsRepository)
    private readonly memberships: IMembershipsRepository
  ) {}

  async execute(input: IFailDeliveryInput): Promise<void> {
    const { userId, orderId, reason } = input

    const assignment = await this.orders.findDriverAssignment(orderId)

    if (!assignment) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado.`)
    }

    await requireAssignedDriverMemberId(this.memberships, userId, assignment)

    assertCanTransition(assignment.status, 'DELIVERY_FAILED', 'DRIVER')

    const changed = await this.orders.changeStatus({
      orderId,
      from: assignment.status,
      to: 'DELIVERY_FAILED',
      actorType: 'RESTAURANT_USER',
      actorId: userId,
      reason,
      timestampFields: timestampFieldsFor('DELIVERY_FAILED')
    })

    if (!changed) {
      throw new ConflictError(
        `Pedido ${orderId} saiu de ${assignment.status} antes do UPDATE.`,
        'Este pedido mudou de status enquanto você agia. Recarregue suas entregas.'
      )
    }
  }
}
