export interface IMenuCategory {
  id: string
  name: string
  position: number
  archivedAt: string | null
}

export interface ICreateMenuCategoryData {
  restaurantId: string
  name: string
}

export interface IMenuCategoriesRepository {
  listByRestaurant(restaurantId: string): Promise<IMenuCategory[]>

  findById(restaurantId: string, id: string): Promise<IMenuCategory | null>

  create(data: ICreateMenuCategoryData): Promise<IMenuCategory>

  rename(restaurantId: string, id: string, name: string): Promise<IMenuCategory>

  countActiveProducts(restaurantId: string, id: string): Promise<number>

  archive(restaurantId: string, id: string): Promise<IMenuCategory | null>

  reorder(restaurantId: string, orderedIds: string[]): Promise<IMenuCategory[]>
}
