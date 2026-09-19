import { inject, injectable } from 'tsyringe'
import type { IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import type { IPayment, IPaymentsRepository } from '@/application/interfaces/IPaymentsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'

@injectable()
export class GetOrderPaymentUseCase {
  constructor(
    @inject(TOKENS.PaymentsRepository)
    private readonly payments: IPaymentsRepository,
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository
  ) {}

  async execute(customerId: string, orderId: string): Promise<IPayment> {
    const order = await this.orders.findByIdForCustomer(customerId, orderId)

    if (!order) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado para o cliente ${customerId}.`)
    }

    const payment = await this.payments.findLatestByOrder(orderId)

    if (!payment) {
      throw new NotFoundError(`Pedido ${orderId} não tem cobrança.`, 'Este pedido não tem um Pix.')
    }

    return payment
  }
}
