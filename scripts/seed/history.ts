import { eq, sql } from 'drizzle-orm'
import { v7 } from 'uuid'
import type { IOutboxEvent } from '@/application/interfaces/IEventPublisher.js'
import type { IDatabaseConnection } from '@/db/client.js'
import {
  deliveryConfirmationAttempts,
  orderItems,
  orderStatusHistory,
  orders,
  outboxEvents,
  payments,
  restaurantOrderCounters,
  restaurants,
  reviews
} from '@/db/schema/index.js'
import type { OrderEventType, OrderStatus, PaymentMethod } from '@/domain/enums.js'
import type { IShift } from '@/domain/opening-hours.js'
import {
  ACTOR_TYPE_BY_TRANSITION_ACTOR,
  assertCanTransition,
  initialOrderStatus,
  type OrderTimestampField,
  type TransitionActor,
  timestampFieldsFor
} from '@/domain/order-status.js'
import { calculateLineTotal } from '@/domain/pricing.js'
import { toBusinessDate } from '@/domain/time.js'
import { DrizzleAnalyticsRepository } from '@/infra/repositories/DrizzleAnalyticsRepository.js'
import type { ISeedAddress } from './data.js'

export interface IHistoryProduct {
  id: string
  name: string
  priceCents: number
  kind: 'main' | 'side'
  top: boolean
  archived: boolean
}

export interface IHistoryDriver {
  memberId: string
  userId: string
}

export interface IHistoryRestaurant {
  id: string
  city: string
  ownerUserId: string
  deliveryFeeCents: number
  minOrderCents: number
  avgPrepTimeMin: number
  shifts: IShift[]
  ratingBias: number
  ordersPerDay: [number, number]
  drivers: IHistoryDriver[]
  products: IHistoryProduct[]
}

export interface IHistoryCustomer {
  id: string
  weight: number
  addresses: ISeedAddress[]
}

const HISTORY_DAYS = 60
const ARCHIVED_PRODUCTS_LEFT_MENU_DAYS_AGO = 20
const PIX_EXPIRES_IN_MINUTES = 30
const SAO_PAULO_UTC_OFFSET_MINUTES = 180
const DAY_MS = 86_400_000
const MINUTE_MS = 60_000
const INSERT_CHUNK = 500
const EVENT_CONCURRENCY = 8

const ORDER_NOTES = [
  'Interfone quebrado, me ligue quando chegar.',
  'Pode deixar na portaria.',
  'Mandar talheres descartáveis.',
  'Não precisa de talheres nem guardanapo.',
  'Tocar a campainha do fundo.'
]
const ITEM_NOTES = ['Sem cebola, por favor.', 'Molho à parte.', 'Capricha no molho!', 'Sem gelo.']
const CUSTOMER_CANCEL_REASONS = ['Pedi no restaurante errado.', 'Demorou para aceitar.']
const REJECT_REASONS = ['Produto esgotado.', 'Cozinha sobrecarregada no momento.']
const OWNER_CANCEL_REASONS = [
  'Faltou ingrediente para o pedido.',
  'Problema no forno, não conseguiremos entregar.'
]
const DELIVERY_FAILED_REASONS = ['Cliente não atendeu.', 'Endereço não encontrado.']

const COMMENTS: Record<number, string[]> = {
  5: [
    'Chegou quentinho e muito bem embalado. Perfeito!',
    'Melhor do bairro, peço toda semana.',
    'Entrega rápida e o sabor impecável.',
    'Porção generosa, vale cada centavo.'
  ],
  4: [
    'Muito bom, só demorou um pouco mais que o previsto.',
    'Gostei bastante, voltaria a pedir.',
    'Saboroso, mas a embalagem podia ser melhor.'
  ],
  3: [
    'Ok, nada demais.',
    'Chegou um pouco frio, mas o sabor estava bom.',
    'Esperava mais pelo preço.'
  ],
  2: ['Veio faltando o molho que pedi.', 'Demorou muito e chegou frio.'],
  1: ['Pedido veio errado e ninguém atendeu o telefone.', 'Muito salgado, não consegui comer.']
}

const REPLIES: Record<'good' | 'bad', string[]> = {
  good: [
    'Obrigado pelo carinho! Esperamos você de novo em breve.',
    'Que bom que gostou! A equipe agradece.'
  ],
  bad: [
    'Sentimos muito pela experiência. Já conversamos com a equipe para não se repetir.',
    'Pedimos desculpas! Entre em contato com a gente para compensarmos no próximo pedido.'
  ]
}

type OrderInsert = typeof orders.$inferInsert
type OrderItemInsert = typeof orderItems.$inferInsert
type StatusHistoryInsert = typeof orderStatusHistory.$inferInsert
type PaymentInsert = typeof payments.$inferInsert
type AttemptInsert = typeof deliveryConfirmationAttempts.$inferInsert
type OutboxInsert = typeof outboxEvents.$inferInsert
type ReviewInsert = typeof reviews.$inferInsert

interface IHistoryRows {
  orders: OrderInsert[]
  items: OrderItemInsert[]
  statusHistory: StatusHistoryInsert[]
  payments: PaymentInsert[]
  attempts: AttemptInsert[]
  outbox: OutboxInsert[]
  events: IOutboxEvent[]
  reviews: ReviewInsert[]
}

function createRandom(seed: number): () => number {
  let state = seed

  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

const random = createRandom(20_260_923)

function between(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function chance(probability: number): boolean {
  return random() < probability
}

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)]

  if (item === undefined) {
    throw new Error('pick em lista vazia')
  }

  return item
}

function pickWeighted<T>(items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let cursor = random() * total

  for (const item of items) {
    cursor -= weight(item)

    if (cursor <= 0) {
      return item
    }
  }

  return pick(items)
}

function gaussian(): number {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
}

function addMinutes(date: Date, min: number, max: number): Date {
  return new Date(date.getTime() + (min + random() * (max - min)) * MINUTE_MS)
}

function toMinutes(value: string): number {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)

  return hours * 60 + minutes
}

function uuidAt(date: Date): string {
  return v7({ msecs: date.getTime() })
}

function chunk<T>(rows: T[]): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
    chunks.push(rows.slice(index, index + INSERT_CHUNK))
  }

  return chunks
}

function orderTimesForDay(restaurant: IHistoryRestaurant, daysAgo: number, now: Date): Date[] {
  const [year, month, day] = toBusinessDate(now).split('-').map(Number)
  const midnight = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) - daysAgo * DAY_MS
  const dayOfWeek = new Date(midnight).getUTCDay()
  const shifts = restaurant.shifts.filter((shift) => shift.dayOfWeek === dayOfWeek)

  if (shifts.length === 0) {
    return []
  }

  const weekendBoost = dayOfWeek === 5 || dayOfWeek === 6 ? 1.35 : dayOfWeek === 0 ? 1.15 : 1
  const growth = 0.75 + 0.45 * (1 - daysAgo / HISTORY_DAYS)
  const [min, max] = restaurant.ordersPerDay
  const count = Math.round(between(min, max) * weekendBoost * growth)
  const latest = now.getTime() - 3 * 60 * MINUTE_MS
  const times: Date[] = []

  for (let index = 0; index < count; index++) {
    const shift = pick(shifts)
    const opens = toMinutes(shift.opensAt)
    const rawCloses = toMinutes(shift.closesAt)
    const closes = rawCloses > opens ? rawCloses : rawCloses + 1440
    const minuteOfDay = opens + random() * Math.max(1, closes - opens - 20)
    const time = midnight + (minuteOfDay + SAO_PAULO_UTC_OFFSET_MINUTES) * MINUTE_MS

    if (time < latest) {
      times.push(new Date(time))
    }
  }

  return times
}

function buildLines(restaurant: IHistoryRestaurant, createdAt: Date, archivedCutoff: Date) {
  const menu = restaurant.products.filter(
    (product) => !product.archived || createdAt < archivedCutoff
  )
  const mains = menu.filter((product) => product.kind === 'main')
  const sides = menu.filter((product) => product.kind === 'side')
  const chosen = new Map<string, { product: IHistoryProduct; quantity: number }>()
  const weight = (product: IHistoryProduct) => (product.top ? 4 : 1)

  const add = (pool: IHistoryProduct[], quantity: number) => {
    const product = pickWeighted(pool, weight)
    const line = chosen.get(product.id)

    if (line) {
      line.quantity += 1
    } else {
      chosen.set(product.id, { product, quantity })
    }
  }

  const mainLines = chance(0.15) ? 3 : chance(0.4) ? 2 : 1

  for (let index = 0; index < mainLines; index++) {
    add(mains, chance(0.25) ? 2 : 1)
  }

  if (sides.length > 0 && chance(0.65)) {
    add(sides, chance(0.3) ? 2 : 1)

    if (chance(0.3)) {
      add(sides, 1)
    }
  }

  const subtotal = () =>
    [...chosen.values()].reduce(
      (sum, line) =>
        sum +
        calculateLineTotal({ priceCents: line.product.priceCents, quantity: line.quantity })
          .totalCents,
      0
    )

  while (subtotal() < restaurant.minOrderCents) {
    add(mains, 1)
  }

  return { lines: [...chosen.values()], subtotalCents: subtotal() }
}

function sampleRating(bias: number): number {
  return Math.min(5, Math.max(1, Math.round(bias + gaussian() * 0.8)))
}

function simulateRestaurant(
  restaurant: IHistoryRestaurant,
  customers: IHistoryCustomer[],
  now: Date,
  rows: IHistoryRows
): number {
  const archivedCutoff = new Date(now.getTime() - ARCHIVED_PRODUCTS_LEFT_MENU_DAYS_AGO * DAY_MS)
  const localCustomers = customers.filter((customer) =>
    customer.addresses.some((address) => address.city === restaurant.city)
  )

  if (localCustomers.length === 0 || restaurant.drivers.length === 0) {
    return 0
  }

  const times: Date[] = []

  for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    times.push(...orderTimesForDay(restaurant, daysAgo, now))
  }

  times.sort((a, b) => a.getTime() - b.getTime())

  times.forEach((createdAt, index) => {
    const customer = pickWeighted(localCustomers, (candidate) => candidate.weight)
    const address = pick(customer.addresses.filter((item) => item.city === restaurant.city))
    const paymentMethod = pickWeighted<PaymentMethod>(
      ['ONLINE', 'CARD_ON_DELIVERY', 'CASH'],
      (method) => ({ ONLINE: 45, CARD_ON_DELIVERY: 35, CASH: 20 })[method]
    )
    const orderId = uuidAt(createdAt)
    const { lines, subtotalCents } = buildLines(restaurant, createdAt, archivedCutoff)
    const totalCents = subtotalCents + restaurant.deliveryFeeCents

    let status: OrderStatus = initialOrderStatus(paymentMethod)
    let paymentStatus: OrderInsert['paymentStatus'] = 'PENDING'
    let cursor = createdAt
    let cancellationReason: string | null = null
    let driver: IHistoryDriver | null = null
    const timestamps: Partial<Record<OrderTimestampField, Date>> = {}

    const record = (at: Date, type: OrderEventType) => {
      const id = uuidAt(at)

      rows.events.push({ id, type, orderId })
      rows.outbox.push({
        id,
        type,
        orderId,
        createdAt: at,
        publishedAt: new Date(at.getTime() + 2000)
      })
    }

    let payment: PaymentInsert | null = null

    const move = (
      to: OrderStatus,
      actor: TransitionActor,
      actorId: string | null,
      minutes: [number, number],
      reason?: string
    ) => {
      assertCanTransition(status, to, actor)
      cursor = addMinutes(cursor, minutes[0], minutes[1])
      rows.statusHistory.push({
        id: uuidAt(cursor),
        orderId,
        fromStatus: status,
        toStatus: to,
        actorType: ACTOR_TYPE_BY_TRANSITION_ACTOR[actor],
        actorId,
        reason: reason ?? null,
        createdAt: cursor
      })

      for (const field of timestampFieldsFor(to)) {
        timestamps[field] = cursor
      }

      if (to === 'PENDING') {
        record(cursor, 'ORDER_CREATED')
      }

      if (to === 'DELIVERED') {
        record(cursor, 'ORDER_DELIVERED')
      }

      // A expiração do Pix cancela sem evento: o pedido nunca chegou a contar como criado.
      if ((to === 'CANCELED' || to === 'REJECTED') && status !== 'PENDING_PAYMENT') {
        record(cursor, 'ORDER_CANCELED')

        if (payment && paymentStatus === 'PAID') {
          payment.status = 'REFUNDED'
          payment.refundedAt = addMinutes(cursor, 2, 10)
          paymentStatus = 'REFUNDED'
        }
      }

      status = to
    }

    rows.statusHistory.push({
      id: uuidAt(createdAt),
      orderId,
      fromStatus: null,
      toStatus: status,
      actorType: 'CUSTOMER',
      actorId: customer.id,
      createdAt
    })

    if (status === 'PENDING') {
      record(createdAt, 'ORDER_CREATED')
    }

    if (paymentMethod === 'ONLINE') {
      payment = {
        id: uuidAt(createdAt),
        orderId,
        providerChargeId: `seed_char_${orderId.replaceAll('-', '')}`,
        status: 'PENDING',
        amountCents: totalCents,
        brCode: `00020126580014br.gov.bcb.pix0136${orderId}5204000053039865802BR5913MyFood Seed6009SAO PAULO6304SEED`,
        platformFeeCents: 80,
        expiresAt: new Date(createdAt.getTime() + PIX_EXPIRES_IN_MINUTES * MINUTE_MS),
        createdAt
      }

      if (chance(0.07)) {
        move(
          'CANCELED',
          'SYSTEM',
          null,
          [PIX_EXPIRES_IN_MINUTES, PIX_EXPIRES_IN_MINUTES + 2],
          'Pix não pago dentro do prazo.'
        )
        payment.status = 'EXPIRED'
      } else {
        move('PENDING', 'SYSTEM', null, [1, 5])
        payment.status = 'PAID'
        payment.paidAt = cursor
        paymentStatus = 'PAID'
      }
    }

    if (status === 'PENDING') {
      const roll = random()
      const owner = restaurant.ownerUserId

      if (roll < 0.04) {
        cancellationReason = pick(CUSTOMER_CANCEL_REASONS)
        move('CANCELED', 'CUSTOMER', customer.id, [1, 5], cancellationReason)
      } else if (roll < 0.08) {
        cancellationReason = pick(REJECT_REASONS)
        move('REJECTED', 'OWNER', owner, [1, 6], cancellationReason)
      } else {
        move('CONFIRMED', 'OWNER', owner, [1, 5])

        if (roll < 0.1) {
          cancellationReason = pick(OWNER_CANCEL_REASONS)
          move('CANCELED', 'OWNER', owner, [2, 8], cancellationReason)
        } else {
          move('PREPARING', 'OWNER', owner, [1, 4])

          if (roll < 0.12) {
            cancellationReason = pick(OWNER_CANCEL_REASONS)
            move('CANCELED', 'OWNER', owner, [5, 15], cancellationReason)
          } else {
            const prep = restaurant.avgPrepTimeMin
            move('READY', 'OWNER', owner, [prep * 0.6, prep * 1.4])

            driver = pick(restaurant.drivers)
            const assigned = driver
            move('OUT_FOR_DELIVERY', 'OWNER', owner, [2, 12])

            const attempt = (success: boolean) => {
              cursor = addMinutes(cursor, 1, 4)
              rows.attempts.push({
                id: uuidAt(cursor),
                orderId,
                memberId: assigned.memberId,
                success,
                createdAt: cursor
              })
            }

            if (roll < 0.15) {
              for (let tries = between(0, 2); tries > 0; tries--) {
                attempt(false)
              }

              cancellationReason = pick(DELIVERY_FAILED_REASONS)
              move('DELIVERY_FAILED', 'DRIVER', assigned.userId, [10, 25], cancellationReason)
            } else {
              cursor = addMinutes(cursor, 8, 30)

              if (chance(0.08)) {
                attempt(false)
              }

              attempt(true)
              move('DELIVERED', 'DRIVER', assigned.userId, [0, 0.2])
            }
          }
        }
      }
    }

    const finishedAt = timestamps.finishedAt ?? cursor

    if (payment) {
      rows.payments.push({ ...payment, updatedAt: payment.refundedAt ?? finishedAt })
    }

    const changeForCents =
      paymentMethod === 'CASH' && chance(0.5) ? Math.ceil((totalCents + 1) / 5000) * 5000 : null

    rows.orders.push({
      id: orderId,
      displayNumber: index + 1,
      customerId: customer.id,
      restaurantId: restaurant.id,
      driverMemberId: driver?.memberId ?? null,
      status,
      paymentMethod,
      paymentStatus,
      changeForCents,
      subtotalCents,
      deliveryFeeCents: restaurant.deliveryFeeCents,
      discountCents: 0,
      totalCents,
      deliveryCode: String(between(0, 9999)).padStart(4, '0'),
      notes: chance(0.12) ? pick(ORDER_NOTES) : null,
      deliveryZipCode: address.zipCode,
      deliveryStreet: address.street,
      deliveryNumber: address.number,
      deliveryComplement: address.complement ?? null,
      deliveryNeighborhood: address.neighborhood,
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryReference: address.reference ?? null,
      cancellationReason,
      ...timestamps,
      createdAt,
      updatedAt: finishedAt
    })

    for (const { product, quantity } of lines) {
      const { unitPriceCents, totalCents: lineTotalCents } = calculateLineTotal({
        priceCents: product.priceCents,
        quantity
      })

      rows.items.push({
        id: uuidAt(createdAt),
        orderId,
        productId: product.id,
        productName: product.name,
        unitPriceCents,
        quantity,
        totalCents: lineTotalCents,
        notes: chance(0.08) ? pick(ITEM_NOTES) : null
      })
    }

    const deliveredAt = timestamps.deliveredAt

    if (status === 'DELIVERED' && deliveredAt && chance(0.55)) {
      const reviewedAt = addMinutes(deliveredAt, 15, 36 * 60)

      if (reviewedAt < now) {
        const rating = sampleRating(restaurant.ratingBias)
        const repliedAt = chance(0.35) ? addMinutes(reviewedAt, 60, 40 * 60) : null
        const reply =
          repliedAt && repliedAt < now ? pick(REPLIES[rating >= 4 ? 'good' : 'bad']) : null

        rows.reviews.push({
          id: uuidAt(reviewedAt),
          orderId,
          customerId: customer.id,
          restaurantId: restaurant.id,
          rating,
          comment: chance(0.7) ? pick(COMMENTS[rating] ?? []) : null,
          reply,
          repliedAt: reply ? repliedAt : null,
          createdAt: reviewedAt,
          updatedAt: reply && repliedAt ? repliedAt : reviewedAt
        })
      }
    }
  })

  return times.length
}

export async function seedOrderHistory(
  database: IDatabaseConnection,
  restaurantsToSeed: IHistoryRestaurant[],
  customers: IHistoryCustomer[]
): Promise<void> {
  const now = new Date()
  const rows: IHistoryRows = {
    orders: [],
    items: [],
    statusHistory: [],
    payments: [],
    attempts: [],
    outbox: [],
    events: [],
    reviews: []
  }
  const counts = new Map<string, number>()

  for (const restaurant of restaurantsToSeed) {
    counts.set(restaurant.id, simulateRestaurant(restaurant, customers, now, rows))
  }

  await database.db.transaction(async (tx) => {
    for (const batch of chunk(rows.orders)) await tx.insert(orders).values(batch)
    for (const batch of chunk(rows.items)) await tx.insert(orderItems).values(batch)
    for (const batch of chunk(rows.statusHistory)) await tx.insert(orderStatusHistory).values(batch)
    for (const batch of chunk(rows.payments)) await tx.insert(payments).values(batch)
    for (const batch of chunk(rows.attempts)) {
      await tx.insert(deliveryConfirmationAttempts).values(batch)
    }
    for (const batch of chunk(rows.outbox)) await tx.insert(outboxEvents).values(batch)
    for (const batch of chunk(rows.reviews)) await tx.insert(reviews).values(batch)

    for (const [restaurantId, count] of counts) {
      await tx
        .update(restaurantOrderCounters)
        .set({ nextNumber: count + 1 })
        .where(eq(restaurantOrderCounters.restaurantId, restaurantId))

      await tx
        .update(restaurants)
        .set({
          ratingAvg: sql`(
            select coalesce(round(avg(r.rating), 2), 0)
            from reviews r where r.restaurant_id = ${restaurantId}
          )`,
          ratingCount: sql`(select count(*) from reviews r where r.restaurant_id = ${restaurantId})`
        })
        .where(eq(restaurants.id, restaurantId))
    }
  })

  process.stdout.write(
    `  ${rows.orders.length} pedidos, ${rows.reviews.length} avaliações, ${rows.outbox.length} eventos\n`
  )

  // Os agregados passam pelo mesmo código do worker, sem SQS no meio: os eventos já nascem
  // publicados para o outbox-publisher não reenviá-los.
  const analytics = new DrizzleAnalyticsRepository(database)
  const events = [...rows.events].sort((a, b) => a.id.localeCompare(b.id))

  for (let index = 0; index < events.length; index += EVENT_CONCURRENCY) {
    await Promise.all(
      events
        .slice(index, index + EVENT_CONCURRENCY)
        .map((event) => analytics.applyOrderEvent(event))
    )
  }
}
