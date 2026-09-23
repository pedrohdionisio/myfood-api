import { inject, injectable } from 'tsyringe'
import type { IMembershipsRepository } from '@/application/interfaces/IMembershipsRepository.js'
import type {
  IOrdersRepository,
  IRestaurantOrder
} from '@/application/interfaces/IOrdersRepository.js'
import type { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError, DomainError, NotFoundError } from '@/domain/errors.js'
import { assertCanTransition, timestampFieldsFor } from '@/domain/order-status.js'

export interface IDispatchOrderInput {
  restaurantId: string
  orderId: string
  driverMemberId: string
  actorId: string
}

@injectable()
export class DispatchOrderUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository,
    @inject(TOKENS.MembershipsRepository)
    private readonly memberships: IMembershipsRepository,
    @inject(TOKENS.NotifyOrderChangeUseCase)
    private readonly notify: NotifyOrderChangeUseCase
  ) {}

  async execute(input: IDispatchOrderInput): Promise<IRestaurantOrder> {
    const { restaurantId, orderId, driverMemberId, actorId } = input

    const order = await this.orders.findByIdForRestaurant(restaurantId, orderId)

    if (!order) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado no restaurante ${restaurantId}.`)
    }

    assertCanTransition(order.status, 'OUT_FOR_DELIVERY', 'OWNER')

    const driver = await this.memberships.findById(restaurantId, driverMemberId)

    if (!driver) {
      throw new NotFoundError(
        `Membro ${driverMemberId} não encontrado no restaurante ${restaurantId}.`
      )
    }

    if (!driver.active || driver.role !== 'DRIVER') {
      throw new DomainError(
        `Membro ${driverMemberId} tem papel ${driver.role} e active=${driver.active}.`,
        'Escolha um entregador ativo da equipe.'
      )
    }

    const changed = await this.orders.changeStatus({
      orderId,
      from: order.status,
      to: 'OUT_FOR_DELIVERY',
      actorType: 'RESTAURANT_USER',
      actorId,
      driverMemberId,
      timestampFields: timestampFieldsFor('OUT_FOR_DELIVERY')
    })

    if (!changed) {
      throw new ConflictError(
        `Pedido ${orderId} saiu de ${order.status} antes do UPDATE.`,
        'Este pedido mudou de status enquanto você agia. Recarregue a lista.'
      )
    }

    const updated = await this.orders.findByIdForRestaurant(restaurantId, orderId)

    if (!updated) {
      throw new NotFoundError(`Pedido ${orderId} desapareceu após a transição.`)
    }

    await this.notify.execute({ change: 'STATUS_CHANGED', actor: 'OWNER', order: updated })

    return updated
  }
}
