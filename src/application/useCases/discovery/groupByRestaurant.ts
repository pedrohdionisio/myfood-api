import type {
  ICuisineCategory,
  IRestaurantCuisine
} from '@/application/interfaces/ICuisinesRepository.js'
import type { IRestaurantShift } from '@/application/interfaces/IOpeningHoursRepository.js'
import type { IShift } from '@/domain/opening-hours.js'

export function groupShiftsByRestaurant(shifts: IRestaurantShift[]): Map<string, IShift[]> {
  const grouped = new Map<string, IShift[]>()

  for (const shift of shifts) {
    const list = grouped.get(shift.restaurantId) ?? []

    list.push(shift)
    grouped.set(shift.restaurantId, list)
  }

  return grouped
}

export function groupCuisinesByRestaurant(
  cuisines: IRestaurantCuisine[]
): Map<string, ICuisineCategory[]> {
  const grouped = new Map<string, ICuisineCategory[]>()

  for (const { restaurantId, ...cuisine } of cuisines) {
    const list = grouped.get(restaurantId) ?? []

    list.push(cuisine)
    grouped.set(restaurantId, list)
  }

  return grouped
}
