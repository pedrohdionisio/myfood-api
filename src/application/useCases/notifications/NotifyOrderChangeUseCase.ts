import { inject, injectable } from 'tsyringe'
import type { IOrderStream } from '@/application/interfaces/IOrderStream.js'
import type { IOrderNotificationTarget } from '@/application/interfaces/IOrdersRepository.js'
import type { IPushGateway } from '@/application/interfaces/IPushGateway.js'
import type { IPushTokensRepository } from '@/application/interfaces/IPushTokensRepository.js'
import { TOKENS } from '@/di/tokens.js'
import {
  customerNotificationFor,
  driverNotificationFor,
  type IOrderNotificationText,
  isVisibleToRestaurant,
  type OrderChange
} from '@/domain/order-notifications.js'
import type { TransitionActor } from '@/domain/order-status.js'

export interface INotifyOrderChangeInput {
  change: OrderChange
  actor: TransitionActor
  order: IOrderNotificationTarget
}

@injectable()
export class NotifyOrderChangeUseCase {
  constructor(
    @inject(TOKENS.OrderStream)
    private readonly stream: IOrderStream,
    @inject(TOKENS.PushTokensRepository)
    private readonly pushTokens: IPushTokensRepository,
    @inject(TOKENS.PushGateway)
    private readonly push: IPushGateway
  ) {}

  async execute(input: INotifyOrderChangeInput): Promise<void> {
    const { change, actor, order } = input

    if (isVisibleToRestaurant(order.status)) {
      this.stream.publish(order.restaurantId, {
        type: change === 'STATUS_CHANGED' ? 'ORDER_STATUS_CHANGED' : 'ORDER_PLACED',
        orderId: order.id,
        displayNumber: order.displayNumber,
        status: order.status,
        occurredAt: new Date().toISOString()
      })
    }

    const context = { change, actor, status: order.status, displayNumber: order.displayNumber }

    const customerText = customerNotificationFor(context)

    if (customerText) {
      await this.sendPush(
        await this.pushTokens.listTokensByCustomer(order.customerId),
        customerText,
        order
      )
    }

    const driverText = driverNotificationFor(context)

    if (driverText && order.driverMemberId) {
      await this.sendPush(
        await this.pushTokens.listTokensByMember(order.driverMemberId),
        driverText,
        order
      )
    }
  }

  private async sendPush(
    tokens: string[],
    text: IOrderNotificationText,
    order: IOrderNotificationTarget
  ): Promise<void> {
    if (tokens.length === 0) {
      return
    }

    const { invalidTokens } = await this.push.send(
      tokens.map((token) => ({
        token,
        title: text.title,
        body: text.body,
        data: { orderId: order.id, status: order.status }
      }))
    )

    await this.pushTokens.deleteByTokens(invalidTokens)
  }
}
