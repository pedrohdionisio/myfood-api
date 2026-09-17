import { inject, injectable } from 'tsyringe'
import type { IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import type { IReview, IReviewsRepository } from '@/application/interfaces/IReviewsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { DomainError, NotFoundError } from '@/domain/errors.js'

export interface ICreateReviewInput {
  customerId: string
  orderId: string
  rating: number
  comment?: string | undefined
}

@injectable()
export class CreateReviewUseCase {
  constructor(
    @inject(TOKENS.ReviewsRepository)
    private readonly reviews: IReviewsRepository,
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository
  ) {}

  async execute(input: ICreateReviewInput): Promise<IReview> {
    const { customerId, orderId, rating, comment } = input

    const order = await this.orders.findByIdForCustomer(customerId, orderId)

    if (!order) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado para o cliente ${customerId}.`)
    }

    if (order.status !== 'DELIVERED') {
      throw new DomainError(
        `Pedido ${orderId} está em ${order.status}.`,
        'Só é possível avaliar um pedido entregue.',
        { status: order.status }
      )
    }

    return this.reviews.create({
      orderId,
      customerId,
      restaurantId: order.restaurantId,
      rating,
      comment
    })
  }
}
