import { describe, expect, it } from 'vitest'
import { ORDER_STATUSES } from '@/domain/enums.js'
import {
  customerNotificationFor,
  driverNotificationFor,
  isVisibleToRestaurant
} from '@/domain/order-notifications.js'

const context = { change: 'STATUS_CHANGED' as const, displayNumber: 42 }

describe('customerNotificationFor', () => {
  it('should not notify the customer about their own action', () => {
    expect(
      customerNotificationFor({ ...context, status: 'CANCELED', actor: 'CUSTOMER' })
    ).toBeNull()
  })

  it('should announce a confirmed payment', () => {
    expect(
      customerNotificationFor({
        ...context,
        change: 'PAYMENT_CONFIRMED',
        status: 'PENDING',
        actor: 'SYSTEM'
      })?.title
    ).toBe('Pagamento confirmado')
  })

  it('should say nothing about statuses that mean nothing to the customer', () => {
    expect(customerNotificationFor({ ...context, status: 'PENDING', actor: 'SYSTEM' })).toBeNull()
  })
})

describe('driverNotificationFor', () => {
  it('should tell the driver about a dispatch', () => {
    expect(
      driverNotificationFor({ ...context, status: 'OUT_FOR_DELIVERY', actor: 'OWNER' })?.title
    ).toBe('Nova entrega')
  })

  it('should tell the driver when the owner ends the delivery', () => {
    expect(
      driverNotificationFor({ ...context, status: 'DELIVERY_FAILED', actor: 'OWNER' })
    ).not.toBeNull()
  })

  it('should stay quiet about what the driver did', () => {
    expect(
      driverNotificationFor({ ...context, status: 'DELIVERY_FAILED', actor: 'DRIVER' })
    ).toBeNull()
  })
})

describe('notification texts', () => {
  it('should reference the order by display number and never by delivery code', () => {
    const texts = ORDER_STATUSES.flatMap((status) => [
      customerNotificationFor({ ...context, status, actor: 'OWNER' }),
      driverNotificationFor({ ...context, status, actor: 'OWNER' })
    ]).filter((text) => text !== null)

    expect(texts.length).toBeGreaterThan(0)
    for (const text of texts) {
      expect(`${text.title} ${text.body}`).not.toMatch(/c[óo]digo/i)
    }
  })
})

describe('isVisibleToRestaurant', () => {
  it('should hide only orders still waiting for payment', () => {
    expect(ORDER_STATUSES.filter((status) => !isVisibleToRestaurant(status))).toEqual([
      'PENDING_PAYMENT'
    ])
  })
})
