import { type DependencyContainer, Lifecycle, container as rootContainer } from 'tsyringe'
import type { IAuthGateway } from '@/application/interfaces/IAuthGateway.js'
import type { ICustomersRepository } from '@/application/interfaces/ICustomersRepository.js'
import type { IMembershipsRepository } from '@/application/interfaces/IMembershipsRepository.js'
import type { IRestaurantUsersRepository } from '@/application/interfaces/IRestaurantUsersRepository.js'
import type { ITokenVerifier } from '@/application/interfaces/ITokenVerifier.js'
import { RefreshSessionUseCase } from '@/application/useCases/auth/RefreshSessionUseCase.js'
import { SignInCustomerUseCase } from '@/application/useCases/auth/SignInCustomerUseCase.js'
import { SignInRestaurantUserUseCase } from '@/application/useCases/auth/SignInRestaurantUserUseCase.js'
import { SignUpCustomerUseCase } from '@/application/useCases/auth/SignUpCustomerUseCase.js'
import { SignUpRestaurantUserUseCase } from '@/application/useCases/auth/SignUpRestaurantUserUseCase.js'
import { CreateMemberUseCase } from '@/application/useCases/members/CreateMemberUseCase.js'
import { ListMyRestaurantsUseCase } from '@/application/useCases/members/ListMyRestaurantsUseCase.js'
import type { Env } from '@/config/env.js'
import { createDatabaseConnection, type IDatabaseConnection } from '@/db/client.js'
import { CognitoAuthGateway } from '@/infra/gateways/CognitoAuthGateway.js'
import { CognitoTokenVerifier } from '@/infra/gateways/CognitoTokenVerifier.js'
import { DrizzleCustomersRepository } from '@/infra/repositories/DrizzleCustomersRepository.js'
import { DrizzleMembershipsRepository } from '@/infra/repositories/DrizzleMembershipsRepository.js'
import { DrizzleRestaurantUsersRepository } from '@/infra/repositories/DrizzleRestaurantUsersRepository.js'
import { TOKENS } from './tokens.js'

export function buildContainer(env: Env): DependencyContainer {
  const container = rootContainer.createChildContainer()

  const database = createDatabaseConnection(env.DATABASE_URL)
  container.register<IDatabaseConnection>(TOKENS.Database, { useValue: database })

  // Dois pools, dois verificadores. Um token do app de cliente não passa no verificador do
  // dashboard porque o issuer e o audience são de outro pool.
  container.register<ITokenVerifier>(TOKENS.CustomerTokenVerifier, {
    useValue: new CognitoTokenVerifier(env.COGNITO_CUSTOMER_POOL_ID, env.COGNITO_CUSTOMER_CLIENT_ID)
  })

  container.register<ITokenVerifier>(TOKENS.RestaurantTokenVerifier, {
    useValue: new CognitoTokenVerifier(
      env.COGNITO_RESTAURANT_POOL_ID,
      env.COGNITO_RESTAURANT_CLIENT_ID
    )
  })

  const credentials =
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
      : undefined

  const customerAuthGateway: IAuthGateway = new CognitoAuthGateway(
    env.COGNITO_CUSTOMER_POOL_ID,
    env.COGNITO_CUSTOMER_CLIENT_ID,
    env.AWS_REGION,
    credentials
  )
  container.register<IAuthGateway>(TOKENS.CustomerAuthGateway, { useValue: customerAuthGateway })

  const restaurantAuthGateway: IAuthGateway = new CognitoAuthGateway(
    env.COGNITO_RESTAURANT_POOL_ID,
    env.COGNITO_RESTAURANT_CLIENT_ID,
    env.AWS_REGION,
    credentials
  )
  container.register<IAuthGateway>(TOKENS.RestaurantAuthGateway, {
    useValue: restaurantAuthGateway
  })

  container.register<ICustomersRepository>(
    TOKENS.CustomersRepository,
    { useClass: DrizzleCustomersRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IRestaurantUsersRepository>(
    TOKENS.RestaurantUsersRepository,
    { useClass: DrizzleRestaurantUsersRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IMembershipsRepository>(
    TOKENS.MembershipsRepository,
    { useClass: DrizzleMembershipsRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.SignUpCustomerUseCase,
    { useClass: SignUpCustomerUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.SignInCustomerUseCase,
    { useClass: SignInCustomerUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(TOKENS.RefreshCustomerSessionUseCase, {
    useValue: new RefreshSessionUseCase(customerAuthGateway)
  })

  container.register(TOKENS.RefreshRestaurantSessionUseCase, {
    useValue: new RefreshSessionUseCase(restaurantAuthGateway)
  })

  container.register(
    TOKENS.SignUpRestaurantUserUseCase,
    { useClass: SignUpRestaurantUserUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.SignInRestaurantUserUseCase,
    { useClass: SignInRestaurantUserUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CreateMemberUseCase,
    { useClass: CreateMemberUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListMyRestaurantsUseCase,
    { useClass: ListMyRestaurantsUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  return container
}
