import type { ISearchFilter } from './IRestaurantsRepository.js'

export interface IProduct {
  id: string
  menuCategoryId: string
  name: string
  description: string | null
  priceCents: number
  imageKey: string | null
  position: number
  isAvailable: boolean
  archivedAt: string | null
}

export interface ICreateProductData {
  restaurantId: string
  menuCategoryId: string
  name: string
  description?: string | undefined
  priceCents: number
  imageKey?: string | undefined
}

export interface IUpdateProductData {
  menuCategoryId?: string | undefined
  name?: string | undefined
  description?: string | null | undefined
  priceCents?: number | undefined
  imageKey?: string | null | undefined
}

export interface IProductSearchHit {
  id: string
  name: string
  description: string | null
  priceCents: number
  imageKey: string | null
  isAvailable: boolean
  restaurantId: string
  restaurantSlug: string
  restaurantTradeName: string
  restaurantLogoKey: string | null
}

export interface IProductsRepository {
  listByRestaurant(restaurantId: string, menuCategoryId?: string): Promise<IProduct[]>

  searchInCity(filter: ISearchFilter): Promise<IProductSearchHit[]>

  listByIds(restaurantId: string, ids: string[]): Promise<IProduct[]>

  findById(restaurantId: string, id: string): Promise<IProduct | null>

  create(data: ICreateProductData): Promise<IProduct>

  update(restaurantId: string, id: string, data: IUpdateProductData): Promise<IProduct>

  setAvailability(restaurantId: string, id: string, isAvailable: boolean): Promise<IProduct>

  archive(restaurantId: string, id: string): Promise<IProduct>

  reorder(restaurantId: string, menuCategoryId: string, orderedIds: string[]): Promise<IProduct[]>
}
