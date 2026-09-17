import { z } from 'zod'
import { MEMBER_ROLES, RESTAURANT_STATUSES } from '@/domain/enums.js'

export const createMemberBodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(MEMBER_ROLES),
  phone: z.string().min(8).max(20).optional()
})

export const memberResponseSchema = z.object({
  membership: z.object({
    id: z.uuid(),
    restaurantId: z.uuid(),
    userId: z.uuid(),
    role: z.enum(MEMBER_ROLES),
    active: z.boolean()
  }),
  user: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.string()
  })
})

export const myRestaurantsResponseSchema = z.array(
  z.object({
    restaurantId: z.uuid(),
    tradeName: z.string(),
    role: z.enum(MEMBER_ROLES),
    restaurantStatus: z.enum(RESTAURANT_STATUSES)
  })
)

export const teamMembersResponseSchema = z.array(
  z.object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    role: z.enum(MEMBER_ROLES),
    active: z.boolean()
  })
)
