import { z } from 'zod'

export const signUpCustomerBodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  phone: z.string().min(8).max(20).optional()
})

export const signInBodySchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128)
})

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1)
})

const sessionSchema = z.object({
  accessToken: z.string(),
  idToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number()
})

const customerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string()
})

export const customerSessionResponseSchema = z.object({
  customer: customerSchema,
  session: sessionSchema
})

export const refreshedSessionResponseSchema = z.object({
  accessToken: z.string(),
  idToken: z.string(),
  expiresIn: z.number()
})

export const customerProfileResponseSchema = customerSchema

export const signUpRestaurantUserBodySchema = signUpCustomerBodySchema

const restaurantUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string()
})

export const restaurantUserSessionResponseSchema = z.object({
  user: restaurantUserSchema,
  session: sessionSchema
})

export const restaurantUserProfileResponseSchema = restaurantUserSchema
