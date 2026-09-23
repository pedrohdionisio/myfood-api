import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICreateProductData,
  IProduct,
  IProductsRepository,
  IUpdateProductData
} from '@/application/interfaces/IProductsRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { menuCategories, products } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'
import { uuidv7 } from '@/shared/uuid.js'
import { violatesUniqueConstraint } from './unique-violation.js'

const DUPLICATE_NAME = 'products_unique_name_per_category'

const PRODUCT_COLUMNS = {
  id: products.id,
  menuCategoryId: products.menuCategoryId,
  name: products.name,
  description: products.description,
  priceCents: products.priceCents,
  imageKey: products.imageKey,
  position: products.position,
  isAvailable: products.isAvailable,
  archivedAt: products.archivedAt
}

interface IProductRow extends Omit<IProduct, 'archivedAt'> {
  archivedAt: Date | null
}

function toProduct(row: IProductRow): IProduct {
  return { ...row, archivedAt: row.archivedAt?.toISOString() ?? null }
}

function rethrowDuplicateName(error: unknown, name: string | undefined): never {
  if (violatesUniqueConstraint(error, DUPLICATE_NAME)) {
    throw new ConflictError(
      `Produto "${name}" já existe e está ativo nesta categoria.`,
      'Já existe um produto com este nome nesta categoria.'
    )
  }

  throw error
}

@injectable()
export class DrizzleProductsRepository implements IProductsRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async listByRestaurant(restaurantId: string, menuCategoryId?: string): Promise<IProduct[]> {
    // O join existe pela ordenação: o dashboard desenha o menu na ordem das categorias, e sem
    // ele os produtos sairiam agrupados pelo uuid da categoria.
    const rows = await this.database.db
      .select(PRODUCT_COLUMNS)
      .from(products)
      .innerJoin(menuCategories, eq(menuCategories.id, products.menuCategoryId))
      .where(
        and(
          eq(products.restaurantId, restaurantId),
          isNull(products.archivedAt),
          menuCategoryId ? eq(products.menuCategoryId, menuCategoryId) : undefined
        )
      )
      .orderBy(asc(menuCategories.position), asc(products.position), asc(products.id))

    return rows.map(toProduct)
  }

  async listByIds(restaurantId: string, ids: string[]): Promise<IProduct[]> {
    if (ids.length === 0) {
      return []
    }

    const rows = await this.database.db
      .select(PRODUCT_COLUMNS)
      .from(products)
      .where(
        and(
          eq(products.restaurantId, restaurantId),
          inArray(products.id, ids),
          isNull(products.archivedAt)
        )
      )

    return rows.map(toProduct)
  }

  async findById(restaurantId: string, id: string): Promise<IProduct | null> {
    const [row] = await this.database.db
      .select(PRODUCT_COLUMNS)
      .from(products)
      .where(and(eq(products.id, id), eq(products.restaurantId, restaurantId)))
      .limit(1)

    return row ? toProduct(row) : null
  }

  async create(data: ICreateProductData): Promise<IProduct> {
    const { restaurantId, menuCategoryId, name, description, priceCents, imageKey } = data

    const nextPosition = sql<number>`(
      select coalesce(max(p.position), -1) + 1
      from products p
      where p.menu_category_id = ${menuCategoryId}
    )`

    try {
      const [row] = await this.database.db
        .insert(products)
        .values({
          id: uuidv7(),
          restaurantId,
          menuCategoryId,
          name,
          description,
          priceCents,
          imageKey,
          position: nextPosition
        })
        .returning(PRODUCT_COLUMNS)

      if (!row) {
        throw new Error('insert de product não retornou linha')
      }

      return toProduct(row)
    } catch (error) {
      rethrowDuplicateName(error, name)
    }
  }

  async update(restaurantId: string, id: string, data: IUpdateProductData): Promise<IProduct> {
    try {
      const [row] = await this.database.db
        .update(products)
        .set(data)
        .where(and(eq(products.id, id), eq(products.restaurantId, restaurantId)))
        .returning(PRODUCT_COLUMNS)

      if (!row) {
        throw new NotFoundError(`Produto ${id} não encontrado no restaurante ${restaurantId}.`)
      }

      return toProduct(row)
    } catch (error) {
      rethrowDuplicateName(error, data.name)
    }
  }

  async setAvailability(restaurantId: string, id: string, isAvailable: boolean): Promise<IProduct> {
    return this.applyUpdate(restaurantId, id, { isAvailable })
  }

  async archive(restaurantId: string, id: string): Promise<IProduct> {
    return this.applyUpdate(restaurantId, id, { archivedAt: new Date() })
  }

  async reorder(
    restaurantId: string,
    menuCategoryId: string,
    orderedIds: string[]
  ): Promise<IProduct[]> {
    return this.database.db.transaction(async (tx) => {
      for (const [position, id] of orderedIds.entries()) {
        await tx
          .update(products)
          .set({ position })
          .where(and(eq(products.id, id), eq(products.restaurantId, restaurantId)))
      }

      const rows = await tx
        .select(PRODUCT_COLUMNS)
        .from(products)
        .where(
          and(
            eq(products.restaurantId, restaurantId),
            eq(products.menuCategoryId, menuCategoryId),
            isNull(products.archivedAt)
          )
        )
        .orderBy(asc(products.position), asc(products.id))

      return rows.map(toProduct)
    })
  }

  private async applyUpdate(
    restaurantId: string,
    id: string,
    values: { isAvailable?: boolean; archivedAt?: Date }
  ): Promise<IProduct> {
    const [row] = await this.database.db
      .update(products)
      .set(values)
      .where(and(eq(products.id, id), eq(products.restaurantId, restaurantId)))
      .returning(PRODUCT_COLUMNS)

    if (!row) {
      throw new NotFoundError(`Produto ${id} não encontrado no restaurante ${restaurantId}.`)
    }

    return toProduct(row)
  }
}
