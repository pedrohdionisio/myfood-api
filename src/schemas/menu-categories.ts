import { z } from 'zod'

export const menuCategoryScopeParamsSchema = z.object({
  restaurantId: z.uuid(),
  categoryId: z.uuid()
})

export const createMenuCategoryBodySchema = z.object({
  name: z.string().trim().min(2).max(80)
})

export const updateMenuCategoryBodySchema = createMenuCategoryBodySchema

export const reorderMenuCategoriesBodySchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, 'Não repita ids na ordenação.')
})

export const menuCategoryResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  position: z.int(),
  archivedAt: z.iso.datetime().nullable()
})

export const menuCategoriesResponseSchema = z.array(menuCategoryResponseSchema)
