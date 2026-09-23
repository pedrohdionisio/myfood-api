import { asc, eq } from 'drizzle-orm'
import { expect } from 'vitest'
import { orderStatusHistory, outboxEvents } from '@/db/schema/index.js'
import type { OrderStatus, PaymentMethod } from '@/domain/enums.js'
import { uuidv7 } from '@/shared/uuid.js'
import type { ITestContext } from './app.js'
import {
  createAddress,
  createCategory,
  createCustomer,
  createProduct,
  createRestaurant,
  createStaff
} from './factories.js'

export async function createOrderingScenario(t: ITestContext) {
  const restaurant = await createRestaurant(t.db)
  const owner = await createStaff(t.db, restaurant.id, 'OWNER')
  const driver = await createStaff(t.db, restaurant.id, 'DRIVER')
  const customer = await createCustomer(t.db)
  const address = await createAddress(t.db, customer.id, { isDefault: true })
  const category = await createCategory(t.db, restaurant.id, { name: 'Lanches' })
  const burger = await createProduct(t.db, restaurant.id, category.id, {
    name: 'X-Burger',
    priceCents: 2500
  })
  const soda = await createProduct(t.db, restaurant.id, category.id, {
    name: 'Refrigerante',
    priceCents: 600
  })

  return { restaurant, owner, driver, customer, address, category, products: { burger, soda } }
}

export type OrderingScenario = Awaited<ReturnType<typeof createOrderingScenario>>

export interface IPlaceOrderOptions {
  paymentMethod?: PaymentMethod
  items?: { productId: string; quantity: number }[]
  idempotencyKey?: string
  body?: Record<string, unknown>
}

export function checkoutBody(scenario: OrderingScenario, options: IPlaceOrderOptions = {}) {
  return {
    restaurantId: scenario.restaurant.id,
    addressId: scenario.address.id,
    paymentMethod: options.paymentMethod ?? 'CASH',
    items: options.items ?? [
      { productId: scenario.products.burger.id, quantity: 2 },
      { productId: scenario.products.soda.id, quantity: 1 }
    ],
    ...options.body
  }
}

export function checkout(
  t: ITestContext,
  scenario: OrderingScenario,
  options: IPlaceOrderOptions = {}
) {
  return t.request('POST', '/orders', {
    token: scenario.customer.token,
    headers: { 'idempotency-key': options.idempotencyKey ?? uuidv7() },
    body: checkoutBody(scenario, options)
  })
}

export async function placeOrder(
  t: ITestContext,
  scenario: OrderingScenario,
  options: IPlaceOrderOptions = {}
) {
  const response = await checkout(t, scenario, options)
  expect(response.statusCode, response.body).toBe(201)
  return response.json<{
    id: string
    deliveryCode: string
    status: OrderStatus
    displayNumber: number
  }>()
}

export function ownerAction(
  t: ITestContext,
  scenario: OrderingScenario,
  orderId: string,
  action: string,
  body: Record<string, unknown> = {}
) {
  return t.request('POST', `/restaurants/${scenario.restaurant.id}/orders/${orderId}/${action}`, {
    token: scenario.owner.token,
    body
  })
}

const PATH_TO: Partial<Record<OrderStatus, OrderStatus[]>> = {
  CONFIRMED: ['CONFIRMED'],
  PREPARING: ['CONFIRMED', 'PREPARING'],
  READY: ['CONFIRMED', 'PREPARING', 'READY'],
  OUT_FOR_DELIVERY: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']
}

const ACTION_FOR: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'confirm',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'dispatch'
}

export async function advanceOrderTo(
  t: ITestContext,
  scenario: OrderingScenario,
  orderId: string,
  status: keyof typeof PATH_TO
): Promise<void> {
  for (const step of PATH_TO[status] ?? []) {
    const body = step === 'OUT_FOR_DELIVERY' ? { driverMemberId: scenario.driver.member.id } : {}
    const response = await ownerAction(t, scenario, orderId, ACTION_FOR[step] ?? '', body)
    expect(response.statusCode, response.body).toBe(200)
  }
}

export function confirmDelivery(
  t: ITestContext,
  scenario: OrderingScenario,
  orderId: string,
  code: string,
  ip?: string
) {
  return t.request('POST', `/orders/${orderId}/confirm-delivery`, {
    token: scenario.driver.token,
    body: { code },
    ...(ip ? { ip } : {})
  })
}

export async function deliverOrder(t: ITestContext, scenario: OrderingScenario) {
  const order = await placeOrder(t, scenario)
  await advanceOrderTo(t, scenario, order.id, 'OUT_FOR_DELIVERY')
  const response = await confirmDelivery(t, scenario, order.id, order.deliveryCode)
  expect(response.statusCode, response.body).toBe(200)
  return order
}

export async function statusHistory(t: ITestContext, orderId: string) {
  const rows = await t.db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(asc(orderStatusHistory.createdAt))
  return rows.map(({ fromStatus, toStatus, actorType }) => ({ fromStatus, toStatus, actorType }))
}

export async function outboxTypes(t: ITestContext, orderId: string) {
  const rows = await t.db
    .select({ type: outboxEvents.type })
    .from(outboxEvents)
    .where(eq(outboxEvents.orderId, orderId))
    .orderBy(asc(outboxEvents.createdAt))
  return rows.map(({ type }) => type)
}
