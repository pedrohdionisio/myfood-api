import { inject, injectable } from 'tsyringe'
import type {
  IOrdersRepository,
  IRestaurantOrder
} from '@/application/interfaces/IOrdersRepository.js'
import { TOKENS } from '@/di/tokens.js'
import type { OrderStatus } from '@/domain/enums.js'

export interface IListRestaurantOrdersInput {
  restaurantId: string
  status?: OrderStatus | undefined
  page: number
  perPage: number
}

export interface IListRestaurantOrdersResult {
  items: IRestaurantOrder[]
  page: number
  perPage: number
  hasMore: boolean
}

@injectable()
export class ListRestaurantOrdersUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository
  ) {}

  async execute(input: IListRestaurantOrdersInput): Promise<IListRestaurantOrdersResult> {
    const { restaurantId, status, page, perPage } = input

    const rows = await this.orders.listByRestaurant(restaurantId, {
      status,
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
