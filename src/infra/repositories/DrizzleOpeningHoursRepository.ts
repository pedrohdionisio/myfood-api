import { asc, eq } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  IOpeningHour,
  IOpeningHoursRepository
} from '@/application/interfaces/IOpeningHoursRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { openingHours } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import type { IShift } from '@/domain/opening-hours.js'

const OPENING_HOUR_COLUMNS = {
  id: openingHours.id,
  dayOfWeek: openingHours.dayOfWeek,
  opensAt: openingHours.opensAt,
  closesAt: openingHours.closesAt
}

// O tipo `time` do Postgres volta como HH:MM:SS, e o contrato da API é HH:MM.
function toOpeningHour(row: IOpeningHour): IOpeningHour {
  return { ...row, opensAt: row.opensAt.slice(0, 5), closesAt: row.closesAt.slice(0, 5) }
}

@injectable()
export class DrizzleOpeningHoursRepository implements IOpeningHoursRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async listByRestaurant(restaurantId: string): Promise<IOpeningHour[]> {
    const rows = await this.database.db
      .select(OPENING_HOUR_COLUMNS)
      .from(openingHours)
      .where(eq(openingHours.restaurantId, restaurantId))
      .orderBy(asc(openingHours.dayOfWeek), asc(openingHours.opensAt))

    return rows.map(toOpeningHour)
  }

  async replaceAll(restaurantId: string, shifts: IShift[]): Promise<IOpeningHour[]> {
    return this.database.db.transaction(async (tx) => {
      await tx.delete(openingHours).where(eq(openingHours.restaurantId, restaurantId))

      if (shifts.length === 0) {
        return []
      }

      const rows = await tx
        .insert(openingHours)
        .values(shifts.map((shift) => ({ ...shift, restaurantId })))
        .returning(OPENING_HOUR_COLUMNS)

      return rows
        .map(toOpeningHour)
        .sort(
          (left, right) =>
            left.dayOfWeek - right.dayOfWeek || left.opensAt.localeCompare(right.opensAt)
        )
    })
  }
}
