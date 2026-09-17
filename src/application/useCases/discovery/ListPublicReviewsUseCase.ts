import { inject, injectable } from 'tsyringe'
import type { IRestaurantsRepository } from '@/application/interfaces/IRestaurantsRepository.js'
import type {
  IReviewListItem,
  IReviewsRepository
} from '@/application/interfaces/IReviewsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'

export interface IListPublicReviewsInput {
  slug: string
  page: number
  perPage: number
}

export interface IListPublicReviewsResult {
  items: IReviewListItem[]
  page: number
  perPage: number
  hasMore: boolean
}

@injectable()
export class ListPublicReviewsUseCase {
  constructor(
    @inject(TOKENS.ReviewsRepository)
    private readonly reviews: IReviewsRepository,
    @inject(TOKENS.RestaurantsRepository)
    private readonly restaurants: IRestaurantsRepository
  ) {}

  async execute(input: IListPublicReviewsInput): Promise<IListPublicReviewsResult> {
    const { slug, page, perPage } = input

    const restaurant = await this.restaurants.findBySlug(slug)

    if (restaurant?.status !== 'ACTIVE') {
      throw new NotFoundError(`Restaurante ${slug} não está ativo.`)
    }

    const rows = await this.reviews.listByRestaurant(restaurant.id, {
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
