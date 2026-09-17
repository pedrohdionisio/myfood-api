import type { DependencyContainer } from 'tsyringe'
import type { ArchiveProductUseCase } from '@/application/useCases/products/ArchiveProductUseCase.js'
import type { CreateProductUseCase } from '@/application/useCases/products/CreateProductUseCase.js'
import type { ListProductsUseCase } from '@/application/useCases/products/ListProductsUseCase.js'
import type { ReorderProductsUseCase } from '@/application/useCases/products/ReorderProductsUseCase.js'
import type { SetProductAvailabilityUseCase } from '@/application/useCases/products/SetProductAvailabilityUseCase.js'
import type { UpdateProductUseCase } from '@/application/useCases/products/UpdateProductUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { restaurantScopeParamsSchema } from '@/schemas/common.js'
import {
  createProductBodySchema,
  listProductsQuerySchema,
  productAvailabilityBodySchema,
  productResponseSchema,
  productScopeParamsSchema,
  productsResponseSchema,
  reorderProductsBodySchema,
  toProductResponse,
  updateProductBodySchema
} from '@/schemas/products.js'
import type { App } from '../app.js'

export function registerProductRoutes(app: App, container: DependencyContainer): void {
  const listProducts = container.resolve<ListProductsUseCase>(TOKENS.ListProductsUseCase)
  const createProduct = container.resolve<CreateProductUseCase>(TOKENS.CreateProductUseCase)
  const updateProduct = container.resolve<UpdateProductUseCase>(TOKENS.UpdateProductUseCase)
  const setAvailability = container.resolve<SetProductAvailabilityUseCase>(
    TOKENS.SetProductAvailabilityUseCase
  )
  const reorderProducts = container.resolve<ReorderProductsUseCase>(TOKENS.ReorderProductsUseCase)
  const archiveProduct = container.resolve<ArchiveProductUseCase>(TOKENS.ArchiveProductUseCase)
  const mediaBaseUrl = container.resolve<string>(TOKENS.MediaBaseUrl)

  app.get(
    '/restaurants/:restaurantId/products',
    {
      schema: {
        tags: ['menu'],
        summary: 'Produtos ativos, na ordem das categorias e das posições',
        params: restaurantScopeParamsSchema,
        querystring: listProductsQuerySchema,
        response: { 200: productsResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership()]
    },
    async (request) => {
      const products = await listProducts.execute(
        request.params.restaurantId,
        request.query.menuCategoryId
      )

      return products.map((product) => toProductResponse(product, mediaBaseUrl))
    }
  )

  app.post(
    '/restaurants/:restaurantId/products',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono cria um produto no fim da categoria',
        params: restaurantScopeParamsSchema,
        body: createProductBodySchema,
        response: { 201: productResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request, reply) => {
      const product = await createProduct.execute({
        restaurantId: request.params.restaurantId,
        ...request.body
      })

      return reply.status(201).send(toProductResponse(product, mediaBaseUrl))
    }
  )

  app.patch(
    '/restaurants/:restaurantId/products/reorder',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono grava a ordem completa dos produtos ativos de uma categoria',
        params: restaurantScopeParamsSchema,
        body: reorderProductsBodySchema,
        response: { 200: productsResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) => {
      const products = await reorderProducts.execute(
        request.params.restaurantId,
        request.body.menuCategoryId,
        request.body.ids
      )

      return products.map((product) => toProductResponse(product, mediaBaseUrl))
    }
  )

  app.patch(
    '/restaurants/:restaurantId/products/:productId',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono edita o produto, inclusive movendo de categoria',
        params: productScopeParamsSchema,
        body: updateProductBodySchema,
        response: { 200: productResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      toProductResponse(
        await updateProduct.execute(
          request.params.restaurantId,
          request.params.productId,
          request.body
        ),
        mediaBaseUrl
      )
  )

  app.patch(
    '/restaurants/:restaurantId/products/:productId/availability',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono marca o produto como esgotado ou disponível',
        params: productScopeParamsSchema,
        body: productAvailabilityBodySchema,
        response: { 200: productResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      toProductResponse(
        await setAvailability.execute(
          request.params.restaurantId,
          request.params.productId,
          request.body.isAvailable
        ),
        mediaBaseUrl
      )
  )

  app.delete(
    '/restaurants/:restaurantId/products/:productId',
    {
      schema: {
        tags: ['menu'],
        summary: 'Dono arquiva o produto; pedidos antigos seguem com o snapshot',
        params: productScopeParamsSchema,
        response: { 200: productResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]
    },
    async (request) =>
      toProductResponse(
        await archiveProduct.execute(request.params.restaurantId, request.params.productId),
        mediaBaseUrl
      )
  )
}
