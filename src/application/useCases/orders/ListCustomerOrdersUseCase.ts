import { inject, injectable } from 'tsyringe'
import type {
  ICustomerOrderSummary,
  IOrdersRepository
} from '@/application/interfaces/IOrdersRepository.js'
import { TOKENS } from '@/di/tokens.js'

export interface IListCustomerOrdersInput {
  customerId: string
  page: number
  perPage: number
}

export interface IListCustomerOrdersResult {
  items: ICustomerOrderSummary[]
  page: number
  perPage: number
  hasMore: boolean
}

@injectable()
export class ListCustomerOrdersUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository
  ) {}

  async execute(input: IListCustomerOrdersInput): Promise<IListCustomerOrdersResult> {
    const { customerId, page, perPage } = input

    const rows = await this.orders.listByCustomer(customerId, {
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
