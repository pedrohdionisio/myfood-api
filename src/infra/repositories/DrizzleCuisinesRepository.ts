import { asc, eq, inArray } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICuisineCategory,
  ICuisinesRepository,
  IRestaurantCuisine
} from '@/application/interfaces/ICuisinesRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { cuisineCategories, restaurantCuisines } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'

const CUISINE_COLUMNS = {
  id: cuisineCategories.id,
  name: cuisineCategories.name,
  slug: cuisineCategories.slug,
  iconKey: cuisineCategories.iconKey
}

@injectable()
export class DrizzleCuisinesRepository implements ICuisinesRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async listAll(): Promise<ICuisineCategory[]> {
    return this.database.db
      .select(CUISINE_COLUMNS)
      .from(cuisineCategories)
      .orderBy(asc(cuisineCategories.position))
  }

  async listByIds(ids: string[]): Promise<ICuisineCategory[]> {
    if (ids.length === 0) {
      return []
    }

    return this.database.db
      .select(CUISINE_COLUMNS)
      .from(cuisineCategories)
      .where(inArray(cuisineCategories.id, ids))
      .orderBy(asc(cuisineCategories.position))
  }

  async listByRestaurant(restaurantId: string): Promise<ICuisineCategory[]> {
    return this.database.db
      .select(CUISINE_COLUMNS)
      .from(restaurantCuisines)
      .innerJoin(cuisineCategories, eq(cuisineCategories.id, restaurantCuisines.cuisineCategoryId))
      .where(eq(restaurantCuisines.restaurantId, restaurantId))
      .orderBy(asc(cuisineCategories.position))
  }

  async listByRestaurants(restaurantIds: string[]): Promise<IRestaurantCuisine[]> {
    if (restaurantIds.length === 0) {
      return []
    }

    return this.database.db
      .select({ ...CUISINE_COLUMNS, restaurantId: restaurantCuisines.restaurantId })
      .from(restaurantCuisines)
      .innerJoin(cuisineCategories, eq(cuisineCategories.id, restaurantCuisines.cuisineCategoryId))
      .where(inArray(restaurantCuisines.restaurantId, restaurantIds))
      .orderBy(asc(cuisineCategories.position))
  }

  async replaceForRestaurant(restaurantId: string, ids: string[]): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      await tx.delete(restaurantCuisines).where(eq(restaurantCuisines.restaurantId, restaurantId))

      if (ids.length > 0) {
        await tx
          .insert(restaurantCuisines)
          .values(ids.map((cuisineCategoryId) => ({ restaurantId, cuisineCategoryId })))
      }
    })
  }
}
