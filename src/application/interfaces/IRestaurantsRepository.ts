import type { RestaurantStatus } from '@/domain/enums.js'

export interface IRestaurant {
  id: string
  slug: string
  legalName: string
  tradeName: string
  cnpj: string
  phone: string | null
  email: string | null
  description: string | null
  logoKey: string | null
  bannerKey: string | null
  zipCode: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  deliveryFeeCents: number
  minOrderCents: number
  avgPrepTimeMin: number
  status: RestaurantStatus
  isAcceptingOrders: boolean
  ratingAvg: number
  ratingCount: number
}

export interface ICreateRestaurantData {
  slug: string
  ownerUserId: string
  legalName: string
  tradeName: string
  cnpj: string
  phone?: string | undefined
  email?: string | undefined
  description?: string | undefined
  zipCode: string
  street: string
  number: string
  complement?: string | undefined
  neighborhood: string
  city: string
  state: string
  deliveryFeeCents?: number | undefined
  minOrderCents?: number | undefined
  avgPrepTimeMin?: number | undefined
}

export interface IUpdateRestaurantData {
  legalName?: string | undefined
  tradeName?: string | undefined
  phone?: string | undefined
  email?: string | undefined
  description?: string | undefined
  zipCode?: string | undefined
  street?: string | undefined
  number?: string | undefined
  complement?: string | undefined
  neighborhood?: string | undefined
  city?: string | undefined
  state?: string | undefined
  deliveryFeeCents?: number | undefined
  minOrderCents?: number | undefined
  avgPrepTimeMin?: number | undefined
}

export interface IRestaurantsRepository {
  findAvailableSlug(base: string): Promise<string>

  findById(id: string): Promise<IRestaurant | null>

  create(data: ICreateRestaurantData): Promise<IRestaurant>

  update(id: string, data: IUpdateRestaurantData): Promise<IRestaurant>
}
