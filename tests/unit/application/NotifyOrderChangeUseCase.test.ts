import { describe, expect, it } from 'vitest'
import type { IOrderStreamEvent } from '@/application/interfaces/IOrderStream.js'
import type { IOrderNotificationTarget } from '@/application/interfaces/IOrdersRepository.js'
import type { IPushTokensRepository } from '@/application/interfaces/IPushTokensRepository.js'
import { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import { InMemoryOrderStream } from '@/infra/streams/InMemoryOrderStream.js'
import { FakePushGateway } from '../../support/fakes/index.js'

const order: IOrderNotificationTarget = {
  id: 'o1',
  restaurantId: 'r1',
  customerId: 'c1',
  displayNumber: 7,
  status: 'OUT_FOR_DELIVERY',
  driverMemberId: 'm1'
}

function setup() {
  const stream = new InMemoryOrderStream()
  const events: IOrderStreamEvent[] = []
  stream.subscribe(order.restaurantId, (event) => events.push(event))

  const deleted: string[] = []
  const pushTokens = {
    listTokensByCustomer: async () => ['customer-token'],
    listTokensByMember: async () => ['driver-token'],
    deleteByTokens: async (tokens: string[]) => {
      deleted.push(...tokens)
    }
  } as unknown as IPushTokensRepository

  const push = new FakePushGateway()
  const notify = new NotifyOrderChangeUseCase(stream, pushTokens, push)

  return { notify, events, push, deleted }
}

describe('NotifyOrderChangeUseCase', () => {
  it('should publish a narrow event and push to the customer and the assigned driver', async () => {
    const { notify, events, push } = setup()

    await notify.execute({ change: 'STATUS_CHANGED', actor: 'OWNER', order })

    expect(events).toHaveLength(1)
    expect(Object.keys(events[0] ?? {}).sort()).toEqual(
      ['displayNumber', 'occurredAt', 'orderId', 'status', 'type'].sort()
    )
    expect(events[0]).toMatchObject({ type: 'ORDER_STATUS_CHANGED', orderId: 'o1' })
    expect(push.sent.map((message) => message.token).sort()).toEqual([
      'customer-token',
      'driver-token'
    ])
    expect(
      push.sent.every((message) => Object.keys(message.data).sort().join() === 'orderId,status')
    ).toBe(true)
  })

  it('should publish nothing to the restaurant while the order waits for payment', async () => {
    const { notify, events } = setup()

    await notify.execute({
      change: 'PLACED',
      actor: 'CUSTOMER',
      order: { ...order, status: 'PENDING_PAYMENT', driverMemberId: null }
    })

    expect(events).toEqual([])
  })

  it('should announce a new order as ORDER_PLACED', async () => {
    const { notify, events } = setup()

    await notify.execute({
      change: 'PLACED',
      actor: 'CUSTOMER',
      order: { ...order, status: 'PENDING', driverMemberId: null }
    })

    expect(events[0]?.type).toBe('ORDER_PLACED')
  })

  it('should delete the tokens the provider reports as invalid', async () => {
    const { notify, push, deleted } = setup()
    push.invalidTokens.add('driver-token')

    await notify.execute({ change: 'STATUS_CHANGED', actor: 'OWNER', order })

    expect(deleted).toEqual(['driver-token'])
  })
})
