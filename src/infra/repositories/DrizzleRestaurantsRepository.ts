import { and, asc, desc, eq, exists, isNull, like, or, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICreateRestaurantData,
  IDiscoveryFilter,
  IRestaurant,
  IRestaurantsRepository,
  IUpdateRestaurantData
} from '@/application/interfaces/IRestaurantsRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import {
  openingHours,
  products,
  restaurantMembers,
  restaurantOrderCounters,
  restaurants
} from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import type { IActivationChecklist } from '@/domain/activation.js'
import type { RestaurantStatus } from '@/domain/enums.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'
import { violatesUniqueConstraint } from './unique-violation.js'

type RestaurantUpdateValues = IUpdateRestaurantData & {
  status?: RestaurantStatus | undefined
  isAcceptingOrders?: boolean | undefined
}

const DUPLICATE_CNPJ = 'restaurants_cnpj_unique'
const DUPLICATE_SLUG = 'restaurants_slug_unique'

const RESTAURANT_COLUMNS = {
  id: restaurants.id,
  slug: restaurants.slug,
  legalName: restaurants.legalName,
  tradeName: restaurants.tradeName,
  cnpj: restaurants.cnpj,
  phone: restaurants.phone,
  email: restaurants.email,
  description: restaurants.description,
  logoKey: restaurants.logoKey,
  bannerKey: restaurants.bannerKey,
  zipCode: restaurants.zipCode,
  street: restaurants.street,
  number: restaurants.number,
  complement: restaurants.complement,
  neighborhood: restaurants.neighborhood,
  city: restaurants.city,
  state: restaurants.state,
  deliveryFeeCents: restaurants.deliveryFeeCents,
  minOrderCents: restaurants.minOrderCents,
  avgPrepTimeMin: restaurants.avgPrepTimeMin,
  status: restaurants.status,
  isAcceptingOrders: restaurants.isAcceptingOrders,
  ratingAvg: restaurants.ratingAvg,
  ratingCount: restaurants.ratingCount
}

@injectable()
export class DrizzleRestaurantsRepository implements IRestaurantsRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async findAvailableSlug(base: string): Promise<string> {
    const rows = await this.database.db
      .select({ slug: restaurants.slug })
      .from(restaurants)
      .where(or(eq(restaurants.slug, base), like(restaurants.slug, `${base}-%`)))

    const taken = new Set(rows.map((row) => row.slug))

    if (!taken.has(base)) {
      return base
    }

    let suffix = 2

    while (taken.has(`${base}-${suffix}`)) {
      suffix++
    }

    return `${base}-${suffix}`
  }

  async listActiveByCity(filter: IDiscoveryFilter): Promise<IRestaurant[]> {
    const { city, state, limit, offset } = filter

    return this.database.db
      .select(RESTAURANT_COLUMNS)
      .from(restaurants)
      .where(
        and(
          eq(restaurants.status, 'ACTIVE'),
          eq(restaurants.state, state),
          sql`immutable_unaccent(lower(${restaurants.city})) = immutable_unaccent(lower(${city}))`
        )
      )
      .orderBy(desc(restaurants.ratingAvg), asc(restaurants.tradeName), asc(restaurants.id))
      .limit(limit)
      .offset(offset)
  }

  async findById(id: string): Promise<IRestaurant | null> {
    const [row] = await this.database.db
      .select(RESTAURANT_COLUMNS)
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1)

    return row ?? null
  }

  async create(data: ICreateRestaurantData): Promise<IRestaurant> {
    const { ownerUserId, ...values } = data

    try {
      return await this.database.db.transaction(async (tx) => {
        const [created] = await tx.insert(restaurants).values(values).returning(RESTAURANT_COLUMNS)

        if (!created) {
          throw new Error('insert de restaurant não retornou linha')
        }

        await tx
          .insert(restaurantMembers)
          .values({ restaurantId: created.id, userId: ownerUserId, role: 'OWNER' })

        await tx.insert(restaurantOrderCounters).values({ restaurantId: created.id })

        return created
      })
    } catch (error) {
      if (violatesUniqueConstraint(error, DUPLICATE_CNPJ)) {
        throw new ConflictError(
          `CNPJ ${data.cnpj} já cadastrado.`,
          'Já existe um restaurante com este CNPJ.'
        )
      }

      if (violatesUniqueConstraint(error, DUPLICATE_SLUG)) {
        throw new ConflictError(
          `Slug ${data.slug} tomado entre a consulta e o insert.`,
          'Não foi possível reservar o endereço do restaurante. Tente novamente.'
        )
      }

      throw error
    }
  }

  private async applyUpdate(id: string, values: RestaurantUpdateValues): Promise<IRestaurant> {
    const [row] = await this.database.db
      .update(restaurants)
      .set(values)
      .where(eq(restaurants.id, id))
      .returning(RESTAURANT_COLUMNS)

    if (!row) {
      throw new NotFoundError(`Restaurante ${id} não encontrado.`)
    }

    return row
  }

  async update(id: string, data: IUpdateRestaurantData): Promise<IRestaurant> {
    return this.applyUpdate(id, data)
  }

  async findActivationChecklist(id: string): Promise<IActivationChecklist> {
    const db = this.database.db

    // exists() do query builder, e não um template sql`...`: dentro do template o Drizzle
    // escreve a coluna sem qualificar a tabela, e `restaurant_id = id` passa a comparar duas
    // colunas do próprio subquery — sempre falso, sem erro nenhum.
    const [row] = await db
      .select({
        hasOpeningHours: exists(
          db
            .select({ one: sql`1` })
            .from(openingHours)
            .where(eq(openingHours.restaurantId, restaurants.id))
        ).mapWith(Boolean),
        hasAvailableProduct: exists(
          db
            .select({ one: sql`1` })
            .from(products)
            .where(
              and(
                eq(products.restaurantId, restaurants.id),
                eq(products.isAvailable, true),
                isNull(products.archivedAt)
              )
            )
        ).mapWith(Boolean)
      })
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1)

    if (!row) {
      throw new NotFoundError(`Restaurante ${id} não encontrado.`)
    }

    return row
  }

  async setStatus(id: string, status: RestaurantStatus): Promise<IRestaurant> {
    return this.applyUpdate(id, { status })
  }

  async setAcceptingOrders(id: string, isAcceptingOrders: boolean): Promise<IRestaurant> {
    return this.applyUpdate(id, { isAcceptingOrders })
  }
}
