import { describe, expect, it } from 'vitest'
import type { IOrderNotificationTarget } from '@/application/interfaces/IOrdersRepository.js'
import type { IPushTokensRepository } from '@/application/interfaces/IPushTokensRepository.js'
import { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import {
  FakeOrderStream,
  FakeOutboxRelayTrigger,
  FakePushGateway
} from '../../support/fakes/index.js'

const order: IOrderNotificationTarget = {
  id: 'o1',
  restaurantId: 'r1',
  customerId: 'c1',
  displayNumber: 7,
  status: 'OUT_FOR_DELIVERY',
  driverMemberId: 'm1'
}

function setup() {
  const stream = new FakeOrderStream()

  const deleted: string[] = []
  const pushTokens = {
    listTokensByCustomer: async () => ['customer-token'],
    listTokensByMember: async () => ['driver-token'],
    deleteByTokens: async (tokens: string[]) => {
      deleted.push(...tokens)
    }
  } as unknown as IPushTokensRepository

  const push = new FakePushGateway()
  const outboxRelay = new FakeOutboxRelayTrigger()
  const notify = new NotifyOrderChangeUseCase(stream, pushTokens, push, outboxRelay)

  return { notify, stream, push, deleted, outboxRelay }
}

describe('NotifyOrderChangeUseCase', () => {
  it('should publish a narrow event and push to the customer and the assigned driver', async () => {
    const { notify, stream, push } = setup()

    await notify.execute({ change: 'STATUS_CHANGED', actor: 'OWNER', order })

    expect(stream.eventsFor(order.restaurantId)).toHaveLength(1)
    expect(Object.keys(stream.eventsFor(order.restaurantId)[0] ?? {}).sort()).toEqual(
      ['displayNumber', 'occurredAt', 'orderId', 'status', 'type'].sort()
    )
    expect(stream.eventsFor(order.restaurantId)[0]).toMatchObject({
      type: 'ORDER_STATUS_CHANGED',
      orderId: 'o1'
    })
    expect(push.sent.map((message) => message.token).sort()).toEqual([
      'customer-token',
      'driver-token'
    ])
    expect(
      push.sent.every((message) => Object.keys(message.data).sort().join() === 'orderId,status')
    ).toBe(true)
  })

  it('should publish nothing to the restaurant while the order waits for payment', async () => {
    const { notify, stream } = setup()

    await notify.execute({
      change: 'PLACED',
      actor: 'CUSTOMER',
      order: { ...order, status: 'PENDING_PAYMENT', driverMemberId: null }
    })

    expect(stream.eventsFor(order.restaurantId)).toEqual([])
  })

  it('should announce a new order as ORDER_PLACED', async () => {
    const { notify, stream } = setup()

    await notify.execute({
      change: 'PLACED',
      actor: 'CUSTOMER',
      order: { ...order, status: 'PENDING', driverMemberId: null }
    })

    expect(stream.eventsFor(order.restaurantId)[0]?.type).toBe('ORDER_PLACED')
  })

  it('should delete the tokens the provider reports as invalid', async () => {
    const { notify, push, deleted } = setup()
    push.invalidTokens.add('driver-token')

    await notify.execute({ change: 'STATUS_CHANGED', actor: 'OWNER', order })

    expect(deleted).toEqual(['driver-token'])
  })

  it('should wake the outbox relay after every committed change', async () => {
    const { notify, outboxRelay } = setup()

    await notify.execute({ change: 'STATUS_CHANGED', actor: 'OWNER', order })
    await notify.execute({ change: 'PAYMENT_CONFIRMED', actor: 'SYSTEM', order })

    expect(outboxRelay.wakes).toBe(2)
  })
})
