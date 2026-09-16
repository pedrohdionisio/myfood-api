export interface ICuisineCategory {
  id: string
  name: string
  slug: string
  iconKey: string | null
}

export interface ICuisinesRepository {
  listAll(): Promise<ICuisineCategory[]>

  listByIds(ids: string[]): Promise<ICuisineCategory[]>

  listByRestaurant(restaurantId: string): Promise<ICuisineCategory[]>

  replaceForRestaurant(restaurantId: string, ids: string[]): Promise<void>
}
