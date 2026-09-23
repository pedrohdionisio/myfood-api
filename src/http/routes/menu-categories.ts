import type { DependencyContainer } from 'tsyringe'
import type { ArchiveMenuCategoryUseCase } from '@/application/useCases/menuCategories/ArchiveMenuCategoryUseCase.js'
import type { CreateMenuCategoryUseCase } from '@/application/useCases/menuCategories/CreateMenuCategoryUseCase.js'
import type { ListMenuCategoriesUseCase } from '@/application/useCases/menuCategories/ListMenuCategoriesUseCase.js'
import type { ReorderMenuCategoriesUseCase } from '@/application/useCases/menuCategories/ReorderMenuCategoriesUseCase.js'
import type { UpdateMenuCategoryUseCase } from '@/application/useCases/menuCategories/UpdateMenuCategoryUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  createMenuCategoryBodySchema,
  menuCategoriesResponseSchema,
  menuCategoryResponseSchema,
  menuCategoryScopeParamsSchema,
  reorderMenuCategoriesBodySchema,
  updateMenuCategoryBodySchema
} from '@/schemas/menu-categories.js'
import type { App } from '../app.js'

export function registerMenuCategoryRoutes(app: App, container: DependencyContainer): void {
  const listMenuCategories = container.resolve<ListMenuCategoriesUseCase>(
    TOKENS.ListMenuCategoriesUseCase
  )
  const createMenuCategory = container.resolve<CreateMenuCategoryUseCase>(
    TOKENS.CreateMenuCategoryUseCase
  )
  const updateMenuCategory = container.resolve<UpdateMenuCategoryUseCase>(
    TOKENS.UpdateMenuCategoryUseCase
  )
  const archiveMenuCategory = container.resolve<ArchiveMenuCategoryUseCase>(
    TOKENS.ArchiveMenuCategoryUseCase
  )
  const reorderMenuCategories = container.resolve<ReorderMenuCategoriesUseCase>(
    TOKENS.ReorderMenuCategoriesUseCase
  )

  app.get(
    '/restaurants/:restaurantId/menu-categories',
    {
      schema: {
        tags: ['menu'],
        summary: 'Categorias ativas do menu, ordenadas por position',
        params: restaurantScopeParamsSchema,
        response: { 200: menuCategoriesResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) => listMenuCategories.execute(request.params.restaurantId)
  )

  app.post(
    '/restaurants/:restaurantId/menu-categories',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono cria uma categoria no fim da lista',
        params: restaurantScopeParamsSchema,
        body: createMenuCategoryBodySchema,
        response: { 201: menuCategoryResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request, reply) => {
      const category = await createMenuCategory.execute(
        request.params.restaurantId,
        request.body.name
      )

      return reply.status(201).send(category)
    }
  )

  app.patch(
    '/restaurants/:restaurantId/menu-categories/reorder',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono grava a ordem completa das categorias ativas',
        params: restaurantScopeParamsSchema,
        body: reorderMenuCategoriesBodySchema,
        response: { 200: menuCategoriesResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) => reorderMenuCategories.execute(request.params.restaurantId, request.body.ids)
  )

  app.patch(
    '/restaurants/:restaurantId/menu-categories/:categoryId',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono renomeia a categoria',
        params: menuCategoryScopeParamsSchema,
        body: updateMenuCategoryBodySchema,
        response: { 200: menuCategoryResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      updateMenuCategory.execute(
        request.params.restaurantId,
        request.params.categoryId,
        request.body.name
      )
  )

  app.delete(
    '/restaurants/:restaurantId/menu-categories/:categoryId',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono arquiva a categoria, se ela não tiver produtos ativos',
        params: menuCategoryScopeParamsSchema,
        response: { 200: menuCategoryResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      archiveMenuCategory.execute(request.params.restaurantId, request.params.categoryId)
  )
}
