import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { count } from 'drizzle-orm'
import { createDatabaseConnection } from '@/db/client.js'
import { restaurants } from '@/db/schema/index.js'
import {
  CUSTOMERS,
  type ISeedPerson,
  type ISeedRestaurant,
  OWNERS,
  RESTAURANTS,
  SEED_PASSWORD
} from './data.js'
import {
  type IHistoryCustomer,
  type IHistoryDriver,
  type IHistoryProduct,
  type IHistoryRestaurant,
  seedOrderHistory
} from './history.js'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const API_URL = process.env.SEED_API_URL ?? 'http://localhost:3333'
const MAX_RATE_LIMIT_RETRIES = 10
const CUSTOMER_WEIGHTS = [5, 3, 2, 4, 1, 2, 3, 1]

if (process.env.NODE_ENV === 'production') {
  process.stderr.write('o seed não roda com NODE_ENV=production\n')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  process.stderr.write('DATABASE_URL não definida\n')
  process.exit(1)
}

interface IRequestOptions {
  token?: string
  body?: unknown
}

async function api<T>(method: string, path: string, options: IRequestOptions = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
    })

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const seconds = Number(response.headers.get('retry-after') ?? 5)

      process.stdout.write(`  limite de requisições, aguardando ${seconds}s...\n`)
      await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000))
      continue
    }

    if (!response.ok) {
      throw new Error(`${method} ${path} respondeu ${response.status}: ${await response.text()}`)
    }

    return (await response.json()) as T
  }
}

interface IAccount {
  id: string
  token: string
}

type Audience = 'customers' | 'restaurant-users'

async function signUp(audience: Audience, person: ISeedPerson): Promise<IAccount> {
  const response = await api<{
    customer?: { id: string }
    user?: { id: string }
    session: { accessToken: string }
  }>('POST', `/auth/${audience}/sign-up`, { body: { ...person, password: SEED_PASSWORD } })

  const id = response.customer?.id ?? response.user?.id

  if (!id) {
    throw new Error(`sign-up de ${person.email} não retornou o id`)
  }

  return { id, token: response.session.accessToken }
}

async function buildRestaurant(
  seed: ISeedRestaurant,
  owner: IAccount,
  cuisineIds: Map<string, string>
): Promise<IHistoryRestaurant> {
  const scope = (path = '') => `/restaurants/${restaurant.id}${path}`
  const call = <T>(method: string, path: string, body?: unknown) =>
    api<T>(method, scope(path), { token: owner.token, body })

  const restaurant = await api<{ id: string }>('POST', '/restaurants', {
    token: owner.token,
    body: {
      tradeName: seed.tradeName,
      legalName: seed.legalName,
      cnpj: seed.cnpj,
      phone: seed.phone,
      email: seed.email,
      description: seed.description,
      ...seed.address,
      deliveryFeeCents: seed.deliveryFeeCents,
      minOrderCents: seed.minOrderCents,
      avgPrepTimeMin: seed.avgPrepTimeMin
    }
  })

  await call('PUT', '/cuisines', {
    cuisineCategoryIds: seed.cuisineSlugs.map((slug) => {
      const id = cuisineIds.get(slug)

      if (!id) {
        throw new Error(`categoria de culinária ${slug} não existe`)
      }

      return id
    })
  })

  if (seed.shifts.length > 0) {
    await call('PUT', '/opening-hours', { shifts: seed.shifts })
  }

  const products: IHistoryProduct[] = []

  for (const category of seed.menu) {
    const created = await call<{ id: string }>('POST', '/menu-categories', { name: category.name })

    for (const product of category.products) {
      const { id } = await call<{ id: string }>('POST', '/products', {
        menuCategoryId: created.id,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents
      })

      if (product.unavailable) {
        await call('PATCH', `/products/${id}/availability`, { isAvailable: false })
      }

      if (product.archived) {
        await call('DELETE', `/products/${id}`)
      }

      products.push({
        id,
        name: product.name,
        priceCents: product.priceCents,
        kind: category.kind,
        top: product.top ?? false,
        archived: product.archived ?? false
      })
    }
  }

  for (const email of seed.coOwnerEmails) {
    const coOwner = OWNERS.find((person) => person.email === email)

    if (!coOwner) {
      throw new Error(`sócio ${email} não está em OWNERS`)
    }

    await call('POST', '/members', { ...coOwner, password: SEED_PASSWORD, role: 'OWNER' })
  }

  const drivers: IHistoryDriver[] = []

  for (const driver of seed.drivers) {
    const { membership, user } = await call<{
      membership: { id: string }
      user: { id: string }
    }>('POST', '/members', {
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      password: SEED_PASSWORD,
      role: 'DRIVER'
    })

    drivers.push({ memberId: membership.id, userId: user.id })

    if (driver.deactivate) {
      await call('PATCH', `/members/${membership.id}`, { active: false })
    }
  }

  if (seed.activate) {
    await call('PATCH', '/status', { status: 'ACTIVE' })
  }

  if (seed.acceptingOrders) {
    await call('PATCH', '/accepting-orders', { isAcceptingOrders: true })
  }

  process.stdout.write(`  ${seed.tradeName}: ${products.length} produtos\n`)

  return {
    id: restaurant.id,
    city: seed.address.city,
    ownerUserId: owner.id,
    deliveryFeeCents: seed.deliveryFeeCents,
    minOrderCents: seed.minOrderCents,
    avgPrepTimeMin: seed.avgPrepTimeMin,
    shifts: seed.shifts,
    ratingBias: seed.ratingBias,
    ordersPerDay: seed.ordersPerDay,
    drivers,
    products
  }
}

const database = createDatabaseConnection(process.env.DATABASE_URL, { max: 10 })

try {
  const [existing] = await database.db.select({ total: count() }).from(restaurants)

  if (existing && existing.total > 0) {
    throw new Error(
      'o banco já tem restaurantes. O seed só roda sobre um banco vazio (e sem os usuários @myfood.dev no Cognito).'
    )
  }

  await api('GET', '/ready')

  process.stdout.write('donos\n')
  const owners = new Map<string, IAccount>()

  for (const person of OWNERS) {
    owners.set(person.email, await signUp('restaurant-users', person))
  }

  const cuisines = await api<{ id: string; slug: string }[]>('GET', '/cuisine-categories')
  const cuisineIds = new Map(cuisines.map((cuisine) => [cuisine.slug, cuisine.id]))

  process.stdout.write('restaurantes\n')
  const built: IHistoryRestaurant[] = []

  for (const seed of RESTAURANTS) {
    const owner = owners.get(seed.ownerEmail)

    if (!owner) {
      throw new Error(`dono ${seed.ownerEmail} não está em OWNERS`)
    }

    built.push(await buildRestaurant(seed, owner, cuisineIds))
  }

  process.stdout.write('clientes\n')
  const customers: IHistoryCustomer[] = []

  for (const [index, person] of CUSTOMERS.entries()) {
    const { addresses, ...profile } = person
    const account = await signUp('customers', profile)

    for (const [position, address] of addresses.entries()) {
      await api('POST', '/customers/me/addresses', {
        token: account.token,
        body: { ...address, isDefault: position === 0 }
      })
    }

    customers.push({ id: account.id, weight: CUSTOMER_WEIGHTS[index] ?? 1, addresses })
  }

  process.stdout.write('histórico de pedidos\n')
  await seedOrderHistory(database, built, customers)

  process.stdout.write(`\npronto. Senha de todas as contas: ${SEED_PASSWORD}\n`)
} catch (error) {
  const cause = error instanceof Error && error.cause ? `\ncausa: ${String(error.cause)}` : ''

  process.stderr.write(`\nseed falhou: ${error instanceof Error ? error.message : error}${cause}\n`)
  process.exitCode = 1
} finally {
  await database.close()
}
