import type { FastifyRequest } from 'fastify'
import type { DependencyContainer } from 'tsyringe'
import type {
  IAuthenticatedCustomer,
  ICustomersRepository
} from '@/application/interfaces/ICustomersRepository.js'
import type {
  IAuthenticatedRestaurantUser,
  IRestaurantUsersRepository
} from '@/application/interfaces/IRestaurantUsersRepository.js'
import type { ITokenVerifier, IVerifiedToken } from '@/application/interfaces/ITokenVerifier.js'
import { TOKENS } from '@/di/tokens.js'
import { UnauthorizedError } from '@/domain/errors.js'
import type { App } from '../app.js'

declare module 'fastify' {
  interface FastifyRequest {
    customer?: IAuthenticatedCustomer
    restaurantUser?: IAuthenticatedRestaurantUser
  }

  interface FastifyInstance {
    authenticateCustomer: (request: FastifyRequest) => Promise<void>
    authenticateRestaurantUser: (request: FastifyRequest) => Promise<void>
  }
}

function readBearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Envie o token em Authorization: Bearer <jwt>.')
  }

  return header.slice('Bearer '.length).trim()
}

async function verify(
  request: FastifyRequest,
  verifier: ITokenVerifier,
  pool: 'customer' | 'restaurant'
): Promise<IVerifiedToken> {
  const token = readBearerToken(request)

  try {
    return await verifier.verify(token)
  } catch (error) {
    request.log.info({ err: error, pool }, 'token rejeitado')

    throw new UnauthorizedError(`Token inválido ou expirado para o pool ${pool}.`)
  }
}

// O preHandler garante o valor, mas o tipo segue opcional porque nem toda rota passa por ele.
// Concentrar a checagem aqui evita repeti-la em cada handler.
export function requireCustomer(request: FastifyRequest): IAuthenticatedCustomer {
  if (!request.customer) {
    throw new Error('rota registrada sem o preHandler authenticateCustomer')
  }

  return request.customer
}

export function requireRestaurantUser(request: FastifyRequest): IAuthenticatedRestaurantUser {
  if (!request.restaurantUser) {
    throw new Error('rota registrada sem o preHandler authenticateRestaurantUser')
  }

  return request.restaurantUser
}

export function registerAuth(app: App, container: DependencyContainer): void {
  const customerVerifier = container.resolve<ITokenVerifier>(TOKENS.CustomerTokenVerifier)
  const restaurantVerifier = container.resolve<ITokenVerifier>(TOKENS.RestaurantTokenVerifier)
  const customersRepository = container.resolve<ICustomersRepository>(TOKENS.CustomersRepository)
  const restaurantUsersRepository = container.resolve<IRestaurantUsersRepository>(
    TOKENS.RestaurantUsersRepository
  )

  app.decorateRequest('customer', undefined)
  app.decorateRequest('restaurantUser', undefined)

  app.decorate('authenticateCustomer', async (request: FastifyRequest) => {
    const payload = await verify(request, customerVerifier, 'customer')
    const customer = await customersRepository.findByCognitoSub(payload.sub)

    if (!customer) {
      request.log.warn({ sub: payload.sub }, 'token válido sem customer correspondente')

      throw new UnauthorizedError(
        'Token válido, mas sem customer no banco.',
        'Finalize seu cadastro para continuar.'
      )
    }

    request.customer = customer
  })

  app.decorate('authenticateRestaurantUser', async (request: FastifyRequest) => {
    const payload = await verify(request, restaurantVerifier, 'restaurant')
    const user = await restaurantUsersRepository.findByCognitoSub(payload.sub)

    if (!user) {
      request.log.warn({ sub: payload.sub }, 'token válido sem restaurant_user correspondente')

      throw new UnauthorizedError(
        'Token válido, mas sem restaurant_user no banco.',
        'Finalize seu cadastro para continuar.'
      )
    }

    request.restaurantUser = user
  })
}
