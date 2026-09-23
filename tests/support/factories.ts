import { randomInt } from 'node:crypto'
import type { IDatabaseConnection } from '@/db/client.js'
import {
  customerAddresses,
  customers,
  menuCategories,
  openingHours,
  products,
  restaurantMembers,
  restaurantOrderCounters,
  restaurants,
  restaurantUsers
} from '@/db/schema/index.js'
import { isValidCnpj } from '@/domain/cnpj.js'
import type { MemberRole } from '@/domain/enums.js'
import { uuidv7 } from '@/shared/uuid.js'
import { tokenFor } from './fakes/index.js'

type Db = IDatabaseConnection['db']

let sequence = 0

function next(): number {
  sequence += 1
  return sequence
}

// Sorteia até cair num CNPJ válido (1 em ~100) para não duplicar o cálculo dos dígitos do domínio.
export function generateCnpj(): string {
  for (;;) {
    const candidate = String(randomInt(10 ** 13, 10 ** 14))

    if (isValidCnpj(candidate)) {
      return candidate
    }
  }
}

const ADDRESS = {
  zipCode: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP'
}

export async function createCustomer(
  db: Db,
  overrides: Partial<typeof customers.$inferInsert> = {}
) {
  const n = next()
  const [customer] = await db
    .insert(customers)
    .values({
      cognitoSub: uuidv7(),
      name: `Cliente ${n}`,
      email: `cliente${n}-${uuidv7()}@myfood.test`,
      phone: '11999990000',
      ...overrides
    })
    .returning()

  if (!customer) throw new Error('customer não criado')
  return { ...customer, token: tokenFor('customer', customer.cognitoSub) }
}

export async function createAddress(
  db: Db,
  customerId: string,
  overrides: Partial<typeof customerAddresses.$inferInsert> = {}
) {
  const [address] = await db
    .insert(customerAddresses)
    .values({ customerId, ...ADDRESS, ...overrides })
    .returning()

  if (!address) throw new Error('endereço não criado')
  return address
}

export async function createRestaurantUser(
  db: Db,
  overrides: Partial<typeof restaurantUsers.$inferInsert> = {}
) {
  const n = next()
  const [user] = await db
    .insert(restaurantUsers)
    .values({
      cognitoSub: uuidv7(),
      name: `Usuário ${n}`,
      email: `usuario${n}-${uuidv7()}@myfood.test`,
      ...overrides
    })
    .returning()

  if (!user) throw new Error('restaurant_user não criado')
  return { ...user, token: tokenFor('restaurant', user.cognitoSub) }
}

export interface ICreateRestaurantOptions {
  openAllWeek?: boolean
}

// Por padrão o restaurante já está pronto para vender: ativo, aceitando pedidos e aberto 24/7.
// Teste que precise de outro estado sobrescreve o campo.
export async function createRestaurant(
  db: Db,
  overrides: Partial<typeof restaurants.$inferInsert> = {},
  { openAllWeek = true }: ICreateRestaurantOptions = {}
) {
  const n = next()
  const [restaurant] = await db
    .insert(restaurants)
    .values({
      slug: `restaurante-${n}-${randomInt(1_000_000)}`,
      legalName: `Restaurante ${n} LTDA`,
      tradeName: `Restaurante ${n}`,
      cnpj: generateCnpj(),
      ...ADDRESS,
      deliveryFeeCents: 500,
      minOrderCents: 0,
      status: 'ACTIVE',
      isAcceptingOrders: true,
      ...overrides
    })
    .returning()

  if (!restaurant) throw new Error('restaurante não criado')

  await db.insert(restaurantOrderCounters).values({ restaurantId: restaurant.id })

  if (openAllWeek) {
    // 00:00–00:00 é o dia inteiro para isOpenAt. A validação da rota recusa esse turno, e por
    // isso ele entra direto no banco: 00:00–23:59 deixaria um minuto fechado e testes intermitentes.
    await db.insert(openingHours).values(
      [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        restaurantId: restaurant.id,
        dayOfWeek,
        opensAt: '00:00',
        closesAt: '00:00'
      }))
    )
  }

  return restaurant
}

export async function createMember(
  db: Db,
  restaurantId: string,
  userId: string,
  role: MemberRole = 'OWNER',
  overrides: Partial<typeof restaurantMembers.$inferInsert> = {}
) {
  const [member] = await db
    .insert(restaurantMembers)
    .values({ restaurantId, userId, role, ...overrides })
    .returning()

  if (!member) throw new Error('membro não criado')
  return member
}

export async function createStaff(db: Db, restaurantId: string, role: MemberRole = 'OWNER') {
  const user = await createRestaurantUser(db)
  const member = await createMember(db, restaurantId, user.id, role)
  return { user, member, token: user.token }
}

export async function createCategory(
  db: Db,
  restaurantId: string,
  overrides: Partial<typeof menuCategories.$inferInsert> = {}
) {
  const [category] = await db
    .insert(menuCategories)
    .values({ restaurantId, name: `Categoria ${next()}`, ...overrides })
    .returning()

  if (!category) throw new Error('categoria não criada')
  return category
}

export async function createProduct(
  db: Db,
  restaurantId: string,
  menuCategoryId: string,
  overrides: Partial<typeof products.$inferInsert> = {}
) {
  const [product] = await db
    .insert(products)
    .values({
      restaurantId,
      menuCategoryId,
      name: `Produto ${next()}`,
      priceCents: 2500,
      ...overrides
    })
    .returning()

  if (!product) throw new Error('produto não criado')
  return product
}
