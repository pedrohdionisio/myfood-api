import { inject, injectable } from 'tsyringe'
import type {
  IReviewListItem,
  IReviewsRepository
} from '@/application/interfaces/IReviewsRepository.js'
import { TOKENS } from '@/di/tokens.js'

export interface IListReviewsInput {
  restaurantId: string
  page: number
  perPage: number
}

export interface IListReviewsResult {
  items: IReviewListItem[]
  page: number
  perPage: number
  hasMore: boolean
}

@injectable()
export class ListRestaurantReviewsUseCase {
  constructor(
    @inject(TOKENS.ReviewsRepository)
    private readonly reviews: IReviewsRepository
  ) {}

  async execute(input: IListReviewsInput): Promise<IListReviewsResult> {
    const { restaurantId, page, perPage } = input

    const rows = await this.reviews.listByRestaurant(restaurantId, {
      limit: perPage + 1,
      offset: (page - 1) * perPage
    })

    return {
      items: rows.slice(0, perPage),
      page,
      perPage,
      hasMore: rows.length > perPage
    }
  }
}
