export interface ICuisineCategory {
  id: string
  name: string
  slug: string
  iconKey: string | null
}

export interface IRestaurantCuisine extends ICuisineCategory {
  restaurantId: string
}

export interface ICuisinesRepository {
  listAll(): Promise<ICuisineCategory[]>

  listByIds(ids: string[]): Promise<ICuisineCategory[]>

  listByRestaurant(restaurantId: string): Promise<ICuisineCategory[]>

  listByRestaurants(restaurantIds: string[]): Promise<IRestaurantCuisine[]>

  replaceForRestaurant(restaurantId: string, ids: string[]): Promise<void>
}
