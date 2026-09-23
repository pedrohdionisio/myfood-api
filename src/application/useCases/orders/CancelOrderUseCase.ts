import { inject, injectable } from 'tsyringe'
import type { IOrder, IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import type { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'
import { assertCanTransition, timestampFieldsFor } from '@/domain/order-status.js'

export interface ICancelOrderInput {
  customerId: string
  orderId: string
  reason?: string | undefined
}

@injectable()
export class CancelOrderUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository,
    @inject(TOKENS.NotifyOrderChangeUseCase)
    private readonly notify: NotifyOrderChangeUseCase
  ) {}

  async execute(input: ICancelOrderInput): Promise<IOrder> {
    const { customerId, orderId, reason } = input

    const order = await this.orders.findByIdForCustomer(customerId, orderId)

    if (!order) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado para o cliente ${customerId}.`)
    }

    assertCanTransition(order.status, 'CANCELED', 'CUSTOMER')

    const changed = await this.orders.changeStatus({
      orderId,
      from: order.status,
      to: 'CANCELED',
      actorType: 'CUSTOMER',
      actorId: customerId,
      reason,
      timestampFields: timestampFieldsFor('CANCELED')
    })

    if (!changed) {
      throw new ConflictError(
        `Pedido ${orderId} saiu de ${order.status} antes do UPDATE.`,
        'O restaurante já agiu neste pedido. Recarregue para ver o status.'
      )
    }

    const updated = await this.orders.findByIdForCustomer(customerId, orderId)

    if (!updated) {
      throw new NotFoundError(`Pedido ${orderId} desapareceu após o cancelamento.`)
    }

    await this.notify.execute({ change: 'STATUS_CHANGED', actor: 'CUSTOMER', order: updated })

    return updated
  }
}
