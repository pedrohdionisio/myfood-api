import { inject, injectable } from 'tsyringe'
import type {
  IAnalyticsRepository,
  IDailyStat,
  IProductSale
} from '@/application/interfaces/IAnalyticsRepository.js'
import { TOKENS } from '@/di/tokens.js'

const TOP_PRODUCTS = 10

export interface IGetAnalyticsInput {
  restaurantId: string
  from: string
  to: string
}

export interface IAnalyticsTotals {
  ordersCount: number
  deliveredCount: number
  canceledCount: number
  grossRevenueCents: number
  deliveryFeeRevenueCents: number
  avgTicketCents: number
  avgPrepSeconds: number
}

export interface IAnalyticsResult {
  from: string
  to: string
  totals: IAnalyticsTotals
  daily: IDailyStat[]
  topProducts: IProductSale[]
}

@injectable()
export class GetAnalyticsUseCase {
  constructor(
    @inject(TOKENS.AnalyticsRepository)
    private readonly analytics: IAnalyticsRepository
  ) {}

  async execute(input: IGetAnalyticsInput): Promise<IAnalyticsResult> {
    const range = input

    const [daily, topProducts] = await Promise.all([
      this.analytics.listDailyStats(range),
      this.analytics.listTopProducts(range, TOP_PRODUCTS)
    ])

    const sum = (pick: (stat: IDailyStat) => number) =>
      daily.reduce((total, stat) => total + pick(stat), 0)

    const deliveredCount = sum((stat) => stat.deliveredCount)
    const grossRevenueCents = sum((stat) => stat.grossRevenueCents)
    const totalPrepSeconds = sum((stat) => stat.totalPrepSeconds)

    // As médias são calculadas na leitura: média guardada não se re-agrega por semana ou mês.
    return {
      from: input.from,
      to: input.to,
      totals: {
        ordersCount: sum((stat) => stat.ordersCount),
        deliveredCount,
        canceledCount: sum((stat) => stat.canceledCount),
        grossRevenueCents,
        deliveryFeeRevenueCents: sum((stat) => stat.deliveryFeeRevenueCents),
        avgTicketCents: deliveredCount === 0 ? 0 : Math.round(grossRevenueCents / deliveredCount),
        avgPrepSeconds: deliveredCount === 0 ? 0 : Math.round(totalPrepSeconds / deliveredCount)
      },
      daily,
      topProducts
    }
  }
}
