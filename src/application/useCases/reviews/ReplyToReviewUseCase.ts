import { inject, injectable } from 'tsyringe'
import type { IReview, IReviewsRepository } from '@/application/interfaces/IReviewsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'

export interface IReplyToReviewInput {
  restaurantId: string
  reviewId: string
  reply: string
}

@injectable()
export class ReplyToReviewUseCase {
  constructor(
    @inject(TOKENS.ReviewsRepository)
    private readonly reviews: IReviewsRepository
  ) {}

  async execute(input: IReplyToReviewInput): Promise<IReview> {
    const { restaurantId, reviewId, reply } = input

    const replied = await this.reviews.reply(restaurantId, reviewId, reply)

    if (replied) {
      return replied
    }

    const review = await this.reviews.findById(restaurantId, reviewId)

    if (!review) {
      throw new NotFoundError(
        `Avaliação ${reviewId} não encontrada no restaurante ${restaurantId}.`
      )
    }

    throw new ConflictError(
      `Avaliação ${reviewId} já foi respondida em ${review.repliedAt}.`,
      'Esta avaliação já tem resposta.'
    )
  }
}
