import { inject, injectable } from 'tsyringe'
import type { IOrder, IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'

@injectable()
export class GetCustomerOrderUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository
  ) {}

  async execute(customerId: string, orderId: string): Promise<IOrder> {
    const order = await this.orders.findByIdForCustomer(customerId, orderId)

    if (!order) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado para o cliente ${customerId}.`)
    }

    return order
  }
}
