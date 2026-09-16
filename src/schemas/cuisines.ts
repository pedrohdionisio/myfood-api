import { z } from 'zod'

export const cuisineCategoriesResponseSchema = z.array(
  z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
    iconKey: z.string().nullable()
  })
)

export const replaceRestaurantCuisinesBodySchema = z.object({
  cuisineCategoryIds: z.array(z.uuid()).max(10)
})
