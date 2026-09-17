import { inject, injectable } from 'tsyringe'
import type { IMembershipsRepository } from '@/application/interfaces/IMembershipsRepository.js'
import type {
  IDriverDelivery,
  IOrdersRepository
} from '@/application/interfaces/IOrdersRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { listDriverMemberIds } from './resolveDriverMembership.js'

@injectable()
export class ListMyDeliveriesUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository,
    @inject(TOKENS.MembershipsRepository)
    private readonly memberships: IMembershipsRepository
  ) {}

  async execute(userId: string): Promise<IDriverDelivery[]> {
    const memberIds = await listDriverMemberIds(this.memberships, userId)
    const deliveries = await this.orders.listDeliveriesForMembers(memberIds)

    // D9: em cartão na entrega o entregador não manipula dinheiro, então valor e troco não são
    // informação dele. Só CASH mostra os dois.
    return deliveries.map((delivery) =>
      delivery.paymentMethod === 'CASH'
        ? delivery
        : { ...delivery, totalCents: null, changeForCents: null }
    )
  }
}
