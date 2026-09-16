import { eq, like, or } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICreateRestaurantData,
  IRestaurant,
  IRestaurantsRepository,
  IUpdateRestaurantData
} from '@/application/interfaces/IRestaurantsRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { restaurantMembers, restaurantOrderCounters, restaurants } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'
import { violatesUniqueConstraint } from './unique-violation.js'

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

  async update(id: string, data: IUpdateRestaurantData): Promise<IRestaurant> {
    const [row] = await this.database.db
      .update(restaurants)
      .set(data)
      .where(eq(restaurants.id, id))
      .returning(RESTAURANT_COLUMNS)

    if (!row) {
      throw new NotFoundError(`Restaurante ${id} não encontrado.`)
    }

    return row
  }
}
