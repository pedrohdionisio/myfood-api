import { inject, injectable } from 'tsyringe'
import type { IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import type { IReview, IReviewsRepository } from '@/application/interfaces/IReviewsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'

@injectable()
export class GetOrderReviewUseCase {
  constructor(
    @inject(TOKENS.ReviewsRepository)
    private readonly reviews: IReviewsRepository,
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository
  ) {}

  async execute(customerId: string, orderId: string): Promise<IReview> {
    const order = await this.orders.findByIdForCustomer(customerId, orderId)

    if (!order) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado para o cliente ${customerId}.`)
    }

    const review = await this.reviews.findByOrder(orderId)

    if (!review) {
      throw new NotFoundError(`Pedido ${orderId} ainda não foi avaliado.`)
    }

    return review
  }
}
