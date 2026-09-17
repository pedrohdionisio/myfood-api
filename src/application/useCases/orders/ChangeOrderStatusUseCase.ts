import { inject, injectable } from 'tsyringe'
import type {
  IOrdersRepository,
  IRestaurantOrder
} from '@/application/interfaces/IOrdersRepository.js'
import { TOKENS } from '@/di/tokens.js'
import type { OrderStatus } from '@/domain/enums.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'
import { assertCanTransition, timestampFieldsFor } from '@/domain/order-status.js'

export interface IChangeOrderStatusInput {
  restaurantId: string
  orderId: string
  to: OrderStatus
  actorId: string
  reason?: string | undefined
}

@injectable()
export class ChangeOrderStatusUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository
  ) {}

  async execute(input: IChangeOrderStatusInput): Promise<IRestaurantOrder> {
    const { restaurantId, orderId, to, actorId, reason } = input

    const order = await this.orders.findByIdForRestaurant(restaurantId, orderId)

    if (!order) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado no restaurante ${restaurantId}.`)
    }

    assertCanTransition(order.status, to, 'OWNER')

    const changed = await this.orders.changeStatus({
      orderId,
      from: order.status,
      to,
      actorType: 'RESTAURANT_USER',
      actorId,
      reason,
      timestampFields: timestampFieldsFor(to)
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

    return updated
  }
}
