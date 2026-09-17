import type { IShift } from '@/domain/opening-hours.js'

export interface IOpeningHour extends IShift {
  id: string
}

export interface IRestaurantShift extends IShift {
  restaurantId: string
}

export interface IOpeningHoursRepository {
  listByRestaurant(restaurantId: string): Promise<IOpeningHour[]>

  listByRestaurants(restaurantIds: string[]): Promise<IRestaurantShift[]>

  replaceAll(restaurantId: string, shifts: IShift[]): Promise<IOpeningHour[]>
}
