import type { DependencyContainer } from 'tsyringe'
import type { ForgotPasswordUseCase } from '@/application/useCases/auth/ForgotPasswordUseCase.js'
import type { RefreshSessionUseCase } from '@/application/useCases/auth/RefreshSessionUseCase.js'
import type { ResetPasswordUseCase } from '@/application/useCases/auth/ResetPasswordUseCase.js'
import type { SignInCustomerUseCase } from '@/application/useCases/auth/SignInCustomerUseCase.js'
import type { SignInRestaurantUserUseCase } from '@/application/useCases/auth/SignInRestaurantUserUseCase.js'
import type { SignUpCustomerUseCase } from '@/application/useCases/auth/SignUpCustomerUseCase.js'
import type { SignUpRestaurantUserUseCase } from '@/application/useCases/auth/SignUpRestaurantUserUseCase.js'
import type { UpdateCustomerProfileUseCase } from '@/application/useCases/profile/UpdateCustomerProfileUseCase.js'
import type { UpdateRestaurantUserProfileUseCase } from '@/application/useCases/profile/UpdateRestaurantUserProfileUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import {
  customerProfileResponseSchema,
  customerSessionResponseSchema,
  forgotPasswordBodySchema,
  passwordRecoveryResponseSchema,
  refreshBodySchema,
  refreshedSessionResponseSchema,
  resetPasswordBodySchema,
  restaurantUserProfileResponseSchema,
  restaurantUserSessionResponseSchema,
  signInBodySchema,
  signUpCustomerBodySchema,
  signUpRestaurantUserBodySchema,
  updateProfileBodySchema
} from '@/schemas/auth.js'
import type { App } from '../app.js'
import { requireCustomer, requireRestaurantUser } from '../plugins/auth.js'

const CODE_SENT_MESSAGE =
  'Se este e-mail tiver cadastro, enviamos um código de recuperação para ele.'
const PASSWORD_CHANGED_MESSAGE = 'Senha alterada. Entre com a nova senha.'

// Recuperação de senha é alvo fácil de força bruta e de uso da caixa de entrada de terceiros
// como spam, então o limite é mais apertado que o do login.
const PASSWORD_RECOVERY_RATE_LIMIT = { rateLimit: { max: 5, timeWindow: '1 minute' } }

export function registerCustomerAuthRoutes(app: App, container: DependencyContainer): void {
  const signUp = container.resolve<SignUpCustomerUseCase>(TOKENS.SignUpCustomerUseCase)
  const updateProfile = container.resolve<UpdateCustomerProfileUseCase>(
    TOKENS.UpdateCustomerProfileUseCase
  )
  const signIn = container.resolve<SignInCustomerUseCase>(TOKENS.SignInCustomerUseCase)
  const refresh = container.resolve<RefreshSessionUseCase>(TOKENS.RefreshCustomerSessionUseCase)
  const forgotPassword = container.resolve<ForgotPasswordUseCase>(
    TOKENS.ForgotCustomerPasswordUseCase
  )
  const resetPassword = container.resolve<ResetPasswordUseCase>(TOKENS.ResetCustomerPasswordUseCase)

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

  app.post(
    '/auth/customers/forgot-password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Envia por e-mail o código de recuperação de senha do cliente',
        body: forgotPasswordBodySchema,
        response: { 200: passwordRecoveryResponseSchema }
      },
      config: PASSWORD_RECOVERY_RATE_LIMIT
    },
    async (request) => {
      await forgotPassword.execute(request.body.email)

      return { message: CODE_SENT_MESSAGE }
    }
  )

  app.post(
    '/auth/customers/reset-password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Troca a senha do cliente usando o código recebido por e-mail',
        body: resetPasswordBodySchema,
        response: { 200: passwordRecoveryResponseSchema }
      },
      config: PASSWORD_RECOVERY_RATE_LIMIT
    },
    async (request) => {
      await resetPassword.execute(request.body)

      return { message: PASSWORD_CHANGED_MESSAGE }
    }
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
      const { id, name, email, phone } = requireCustomer(request)

      return { id, name, email, phone }
    }
  )

  app.patch(
    '/customers/me',
    {
      schema: {
        tags: ['customers'],
        summary: 'Cliente edita o próprio nome e telefone',
        body: updateProfileBodySchema,
        response: { 200: customerProfileResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => updateProfile.execute(requireCustomer(request).id, request.body)
  )
}

export function registerRestaurantAuthRoutes(app: App, container: DependencyContainer): void {
  const signUp = container.resolve<SignUpRestaurantUserUseCase>(TOKENS.SignUpRestaurantUserUseCase)
  const updateProfile = container.resolve<UpdateRestaurantUserProfileUseCase>(
    TOKENS.UpdateRestaurantUserProfileUseCase
  )
  const signIn = container.resolve<SignInRestaurantUserUseCase>(TOKENS.SignInRestaurantUserUseCase)
  const refresh = container.resolve<RefreshSessionUseCase>(TOKENS.RefreshRestaurantSessionUseCase)
  const forgotPassword = container.resolve<ForgotPasswordUseCase>(
    TOKENS.ForgotRestaurantPasswordUseCase
  )
  const resetPassword = container.resolve<ResetPasswordUseCase>(
    TOKENS.ResetRestaurantPasswordUseCase
  )

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

  app.post(
    '/auth/restaurant-users/forgot-password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Envia por e-mail o código de recuperação de senha do usuário de restaurante',
        body: forgotPasswordBodySchema,
        response: { 200: passwordRecoveryResponseSchema }
      },
      config: PASSWORD_RECOVERY_RATE_LIMIT
    },
    async (request) => {
      await forgotPassword.execute(request.body.email)

      return { message: CODE_SENT_MESSAGE }
    }
  )

  app.post(
    '/auth/restaurant-users/reset-password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Troca a senha do usuário de restaurante usando o código recebido por e-mail',
        body: resetPasswordBodySchema,
        response: { 200: passwordRecoveryResponseSchema }
      },
      config: PASSWORD_RECOVERY_RATE_LIMIT
    },
    async (request) => {
      await resetPassword.execute(request.body)

      return { message: PASSWORD_CHANGED_MESSAGE }
    }
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
      const { id, name, email, phone } = requireRestaurantUser(request)

      return { id, name, email, phone }
    }
  )

  app.patch(
    '/restaurant-users/me',
    {
      schema: {
        tags: ['restaurant-users'],
        summary: 'Usuário de restaurante edita o próprio nome e telefone',
        body: updateProfileBodySchema,
        response: { 200: restaurantUserProfileResponseSchema }
      },
      preHandler: [app.authenticateRestaurantUser]
    },
    async (request) => updateProfile.execute(requireRestaurantUser(request).id, request.body)
  )
}
