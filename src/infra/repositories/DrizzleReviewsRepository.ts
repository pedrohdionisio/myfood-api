import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICreateReviewData,
  IReview,
  IReviewListItem,
  IReviewPageFilter,
  IReviewsRepository
} from '@/application/interfaces/IReviewsRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { customers, orders, restaurants, reviews } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError } from '@/domain/errors.js'
import { uuidv7 } from '@/shared/uuid.js'
import { violatesUniqueConstraint } from './unique-violation.js'

const DUPLICATE_ORDER = 'reviews_order_id_unique'

const REVIEW_COLUMNS = {
  id: reviews.id,
  orderId: reviews.orderId,
  customerId: reviews.customerId,
  restaurantId: reviews.restaurantId,
  rating: reviews.rating,
  comment: reviews.comment,
  reply: reviews.reply,
  repliedAt: reviews.repliedAt,
  createdAt: reviews.createdAt
}

type IReviewRow = Omit<IReview, 'repliedAt' | 'createdAt'> & {
  repliedAt: Date | null
  createdAt: Date
}

function toReview(row: IReviewRow): IReview {
  return {
    ...row,
    repliedAt: row.repliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  }
}

@injectable()
export class DrizzleReviewsRepository implements IReviewsRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async findByOrder(orderId: string): Promise<IReview | null> {
    const [row] = await this.database.db
      .select(REVIEW_COLUMNS)
      .from(reviews)
      .where(eq(reviews.orderId, orderId))
      .limit(1)

    return row ? toReview(row) : null
  }

  async findById(restaurantId: string, id: string): Promise<IReview | null> {
    const [row] = await this.database.db
      .select(REVIEW_COLUMNS)
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.restaurantId, restaurantId)))
      .limit(1)

    return row ? toReview(row) : null
  }

  async create(data: ICreateReviewData): Promise<IReview> {
    const { restaurantId } = data

    try {
      return await this.database.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(reviews)
          .values({ ...data, id: uuidv7() })
          .returning(REVIEW_COLUMNS)

        if (!created) {
          throw new Error('insert de review não retornou linha')
        }

        // D10: o agregado é recalculado aqui, não por evento. É uma média sobre um restaurante,
        // e passar por SQS deixaria uma janela em que o cliente não vê a própria nota contada.
        await tx
          .update(restaurants)
          .set({
            ratingAvg: sql`(
              select coalesce(round(avg(r.rating), 2), 0)
              from reviews r where r.restaurant_id = ${restaurantId}
            )`,
            ratingCount: sql`(
              select count(*) from reviews r where r.restaurant_id = ${restaurantId}
            )`
          })
          .where(eq(restaurants.id, restaurantId))

        return toReview(created)
      })
    } catch (error) {
      if (violatesUniqueConstraint(error, DUPLICATE_ORDER)) {
        throw new ConflictError(
          `Pedido ${data.orderId} já foi avaliado.`,
          'Você já avaliou este pedido.'
        )
      }

      throw error
    }
  }

  // A ausência de resposta vai no WHERE: duas respostas simultâneas não se sobrescrevem, e a
  // segunda recebe null em vez de substituir a primeira em silêncio.
  async reply(restaurantId: string, id: string, reply: string): Promise<IReview | null> {
    const [row] = await this.database.db
      .update(reviews)
      .set({ reply, repliedAt: new Date() })
      .where(and(eq(reviews.id, id), eq(reviews.restaurantId, restaurantId), isNull(reviews.reply)))
      .returning(REVIEW_COLUMNS)

    return row ? toReview(row) : null
  }

  async listByRestaurant(
    restaurantId: string,
    filter: IReviewPageFilter
  ): Promise<IReviewListItem[]> {
    const rows = await this.database.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        reply: reviews.reply,
        repliedAt: reviews.repliedAt,
        createdAt: reviews.createdAt,
        customerName: customers.name,
        orderId: reviews.orderId,
        orderDisplayNumber: orders.displayNumber
      })
      .from(reviews)
      .innerJoin(customers, eq(customers.id, reviews.customerId))
      .innerJoin(orders, eq(orders.id, reviews.orderId))
      .where(eq(reviews.restaurantId, restaurantId))
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(filter.limit)
      .offset(filter.offset)

    return rows.map((row) => ({
      ...row,
      repliedAt: row.repliedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    }))
  }
}
