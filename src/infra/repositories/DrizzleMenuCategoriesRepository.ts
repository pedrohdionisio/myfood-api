import { and, asc, count, eq, isNull, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICreateMenuCategoryData,
  IMenuCategoriesRepository,
  IMenuCategory
} from '@/application/interfaces/IMenuCategoriesRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { menuCategories, products } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'
import { uuidv7 } from '@/shared/uuid.js'
import { violatesUniqueConstraint } from './unique-violation.js'

const DUPLICATE_NAME = 'menu_categories_unique_name'

function rethrowDuplicateName(error: unknown, name: string): never {
  if (violatesUniqueConstraint(error, DUPLICATE_NAME)) {
    throw new ConflictError(
      `Categoria "${name}" já existe e está ativa.`,
      'Já existe uma categoria com este nome.'
    )
  }

  throw error
}

const MENU_CATEGORY_COLUMNS = {
  id: menuCategories.id,
  name: menuCategories.name,
  position: menuCategories.position,
  archivedAt: menuCategories.archivedAt
}

interface IMenuCategoryRow {
  id: string
  name: string
  position: number
  archivedAt: Date | null
}

function toMenuCategory(row: IMenuCategoryRow): IMenuCategory {
  return { ...row, archivedAt: row.archivedAt?.toISOString() ?? null }
}

@injectable()
export class DrizzleMenuCategoriesRepository implements IMenuCategoriesRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async listByRestaurant(restaurantId: string): Promise<IMenuCategory[]> {
    const rows = await this.database.db
      .select(MENU_CATEGORY_COLUMNS)
      .from(menuCategories)
      .where(and(eq(menuCategories.restaurantId, restaurantId), isNull(menuCategories.archivedAt)))
      .orderBy(asc(menuCategories.position), asc(menuCategories.id))

    return rows.map(toMenuCategory)
  }

  async findById(restaurantId: string, id: string): Promise<IMenuCategory | null> {
    const [row] = await this.database.db
      .select(MENU_CATEGORY_COLUMNS)
      .from(menuCategories)
      .where(and(eq(menuCategories.id, id), eq(menuCategories.restaurantId, restaurantId)))
      .limit(1)

    return row ? toMenuCategory(row) : null
  }

  async create(data: ICreateMenuCategoryData): Promise<IMenuCategory> {
    const { restaurantId, name } = data

    // A categoria nova entra no fim da lista. Sem isto toda categoria nasceria em position 0
    // e a ordem entre elas seria a do id.
    const nextPosition = sql<number>`(
      select coalesce(max(${menuCategories.position}), -1) + 1
      from ${menuCategories}
      where ${menuCategories.restaurantId} = ${restaurantId}
    )`

    try {
      const [row] = await this.database.db
        .insert(menuCategories)
        .values({ id: uuidv7(), restaurantId, name, position: nextPosition })
        .returning(MENU_CATEGORY_COLUMNS)

      if (!row) {
        throw new Error('insert de menu_category não retornou linha')
      }

      return toMenuCategory(row)
    } catch (error) {
      rethrowDuplicateName(error, name)
    }
  }

  async rename(restaurantId: string, id: string, name: string): Promise<IMenuCategory> {
    try {
      const [row] = await this.database.db
        .update(menuCategories)
        .set({ name })
        .where(and(eq(menuCategories.id, id), eq(menuCategories.restaurantId, restaurantId)))
        .returning(MENU_CATEGORY_COLUMNS)

      if (!row) {
        throw new NotFoundError(`Categoria ${id} não encontrada no restaurante ${restaurantId}.`)
      }

      return toMenuCategory(row)
    } catch (error) {
      rethrowDuplicateName(error, name)
    }
  }

  async countActiveProducts(restaurantId: string, id: string): Promise<number> {
    const [row] = await this.database.db
      .select({ total: count() })
      .from(products)
      .where(
        and(
          eq(products.menuCategoryId, id),
          eq(products.restaurantId, restaurantId),
          isNull(products.archivedAt)
        )
      )

    return row?.total ?? 0
  }

  // A condição de produto ativo vai dentro do próprio UPDATE: entre contar e arquivar em duas
  // consultas caberia um produto novo, que ficaria ativo numa categoria arquivada.
  async archive(restaurantId: string, id: string): Promise<IMenuCategory | null> {
    const [row] = await this.database.db
      .update(menuCategories)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(menuCategories.id, id),
          eq(menuCategories.restaurantId, restaurantId),
          isNull(menuCategories.archivedAt),
          // Alias explícito: archived_at existe nas duas tabelas, e dentro de um template sql
          // o Drizzle escreve a coluna sem qualificar, deixando a referência ambígua.
          sql`not exists (
            select 1 from products p
            where p.menu_category_id = ${id} and p.archived_at is null
          )`
        )
      )
      .returning(MENU_CATEGORY_COLUMNS)

    return row ? toMenuCategory(row) : null
  }

  async reorder(restaurantId: string, orderedIds: string[]): Promise<IMenuCategory[]> {
    return this.database.db.transaction(async (tx) => {
      for (const [position, id] of orderedIds.entries()) {
        await tx
          .update(menuCategories)
          .set({ position })
          .where(and(eq(menuCategories.id, id), eq(menuCategories.restaurantId, restaurantId)))
      }

      const rows = await tx
        .select(MENU_CATEGORY_COLUMNS)
        .from(menuCategories)
        .where(
          and(eq(menuCategories.restaurantId, restaurantId), isNull(menuCategories.archivedAt))
        )
        .orderBy(asc(menuCategories.position), asc(menuCategories.id))

      return rows.map(toMenuCategory)
    })
  }
}
