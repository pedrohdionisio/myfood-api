import type { IShift } from '@/domain/opening-hours.js'

export interface IOpeningHour extends IShift {
  id: string
}

export interface IOpeningHoursRepository {
  listByRestaurant(restaurantId: string): Promise<IOpeningHour[]>

  replaceAll(restaurantId: string, shifts: IShift[]): Promise<IOpeningHour[]>
}
