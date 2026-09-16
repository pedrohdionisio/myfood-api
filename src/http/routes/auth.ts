import type { DependencyContainer } from 'tsyringe'
import type { RefreshSessionUseCase } from '@/application/useCases/auth/RefreshSessionUseCase.js'
import type { SignInCustomerUseCase } from '@/application/useCases/auth/SignInCustomerUseCase.js'
import type { SignInRestaurantUserUseCase } from '@/application/useCases/auth/SignInRestaurantUserUseCase.js'
import type { SignUpCustomerUseCase } from '@/application/useCases/auth/SignUpCustomerUseCase.js'
import type { SignUpRestaurantUserUseCase } from '@/application/useCases/auth/SignUpRestaurantUserUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import {
  customerProfileResponseSchema,
  customerSessionResponseSchema,
  refreshBodySchema,
  refreshedSessionResponseSchema,
  restaurantUserProfileResponseSchema,
  restaurantUserSessionResponseSchema,
  signInBodySchema,
  signUpCustomerBodySchema,
  signUpRestaurantUserBodySchema
} from '@/schemas/auth.js'
import type { App } from '../app.js'
import { requireCustomer, requireRestaurantUser } from '../plugins/auth.js'

export function registerCustomerAuthRoutes(app: App, container: DependencyContainer): void {
  const signUp = container.resolve<SignUpCustomerUseCase>(TOKENS.SignUpCustomerUseCase)
  const signIn = container.resolve<SignInCustomerUseCase>(TOKENS.SignInCustomerUseCase)
  const refresh = container.resolve<RefreshSessionUseCase>(TOKENS.RefreshCustomerSessionUseCase)

  app.post(
    '/auth/customers/sign-up',
    {
      schema: {
        tags: ['auth'],
        summary: 'Cria a conta do cliente no Cognito e no banco',
        body: signUpCustomerBodySchema,
        response: { 201: customerSessionResponseSchema }
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    },
    async (request, reply) => reply.status(201).send(await signUp.execute(request.body))
  )

  app.post(
    '/auth/customers/sign-in',
    {
      schema: {
        tags: ['auth'],
        summary: 'Autentica o cliente',
        body: signInBodySchema,
        response: { 200: customerSessionResponseSchema }
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    },
    async (request) => signIn.execute(request.body)
  )

  app.post(
    '/auth/customers/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Renova a sessão do cliente',
        body: refreshBodySchema,
        response: { 200: refreshedSessionResponseSchema }
      }
    },
    async (request) => refresh.execute(request.body.refreshToken)
  )

  app.get(
    '/customers/me',
    {
      schema: {
        tags: ['customers'],
        summary: 'Perfil do cliente autenticado',
        response: { 200: customerProfileResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => {
      const { id, name, email } = requireCustomer(request)

      return { id, name, email }
    }
  )
}

export function registerRestaurantAuthRoutes(app: App, container: DependencyContainer): void {
  const signUp = container.resolve<SignUpRestaurantUserUseCase>(TOKENS.SignUpRestaurantUserUseCase)
  const signIn = container.resolve<SignInRestaurantUserUseCase>(TOKENS.SignInRestaurantUserUseCase)
  const refresh = container.resolve<RefreshSessionUseCase>(TOKENS.RefreshRestaurantSessionUseCase)

  app.post(
    '/auth/restaurant-users/sign-up',
    {
      schema: {
        tags: ['auth'],
        summary: 'Cria a conta do dono no Cognito e no banco (ainda sem restaurante)',
        body: signUpRestaurantUserBodySchema,
        response: { 201: restaurantUserSessionResponseSchema }
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    },
    async (request, reply) => reply.status(201).send(await signUp.execute(request.body))
  )

  app.post(
    '/auth/restaurant-users/sign-in',
    {
      schema: {
        tags: ['auth'],
        summary: 'Autentica o usuário de restaurante',
        body: signInBodySchema,
        response: { 200: restaurantUserSessionResponseSchema }
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    },
    async (request) => signIn.execute(request.body)
  )

  app.post(
    '/auth/restaurant-users/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Renova a sessão do usuário de restaurante',
        body: refreshBodySchema,
        response: { 200: refreshedSessionResponseSchema }
      }
    },
    async (request) => refresh.execute(request.body.refreshToken)
  )

  app.get(
    '/restaurant-users/me',
    {
      schema: {
        tags: ['restaurant-users'],
        summary: 'Perfil do usuário de restaurante autenticado',
        response: { 200: restaurantUserProfileResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request) => {
      const { id, name, email } = requireRestaurantUser(request)

      return { id, name, email }
    }
  )
}
