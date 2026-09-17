export interface IReview {
  id: string
  orderId: string
  customerId: string
  restaurantId: string
  rating: number
  comment: string | null
  reply: string | null
  repliedAt: string | null
  createdAt: string
}

export interface ICreateReviewData {
  orderId: string
  customerId: string
  restaurantId: string
  rating: number
  comment?: string | undefined
}

export interface IReviewListItem {
  id: string
  rating: number
  comment: string | null
  reply: string | null
  repliedAt: string | null
  createdAt: string
  customerName: string
  orderId: string
  orderDisplayNumber: number
}

export interface IReviewPageFilter {
  limit: number
  offset: number
}

export interface IReviewsRepository {
  findByOrder(orderId: string): Promise<IReview | null>

  findById(restaurantId: string, id: string): Promise<IReview | null>

  /** Grava a avaliação e recalcula rating_avg/rating_count do restaurante no mesmo commit (D10). */
  create(data: ICreateReviewData): Promise<IReview>

  reply(restaurantId: string, id: string, reply: string): Promise<IReview | null>

  listByRestaurant(restaurantId: string, filter: IReviewPageFilter): Promise<IReviewListItem[]>
}
