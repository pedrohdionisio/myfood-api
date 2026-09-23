import { type DependencyContainer, Lifecycle, container as rootContainer } from 'tsyringe'
import type { IAuthGateway } from '@/application/interfaces/IAuthGateway.js'
import type { IImageProcessor } from '@/application/interfaces/IImageProcessor.js'
import type { IOrderStream } from '@/application/interfaces/IOrderStream.js'
import type { IPaymentGateway } from '@/application/interfaces/IPaymentGateway.js'
import type { IPushGateway } from '@/application/interfaces/IPushGateway.js'
import type { IStorageGateway } from '@/application/interfaces/IStorageGateway.js'
import type { ITokenVerifier } from '@/application/interfaces/ITokenVerifier.js'
import { GetAnalyticsUseCase } from '@/application/useCases/analytics/GetAnalyticsUseCase.js'
import { ProcessOrderEventUseCase } from '@/application/useCases/analytics/ProcessOrderEventUseCase.js'
import { ForgotPasswordUseCase } from '@/application/useCases/auth/ForgotPasswordUseCase.js'
import { RefreshSessionUseCase } from '@/application/useCases/auth/RefreshSessionUseCase.js'
import { ResetPasswordUseCase } from '@/application/useCases/auth/ResetPasswordUseCase.js'
import { SignInCustomerUseCase } from '@/application/useCases/auth/SignInCustomerUseCase.js'
import { SignInRestaurantUserUseCase } from '@/application/useCases/auth/SignInRestaurantUserUseCase.js'
import { SignUpCustomerUseCase } from '@/application/useCases/auth/SignUpCustomerUseCase.js'
import { SignUpRestaurantUserUseCase } from '@/application/useCases/auth/SignUpRestaurantUserUseCase.js'
import { ListCuisineCategoriesUseCase } from '@/application/useCases/cuisines/ListCuisineCategoriesUseCase.js'
import { ListRestaurantCuisinesUseCase } from '@/application/useCases/cuisines/ListRestaurantCuisinesUseCase.js'
import { ReplaceRestaurantCuisinesUseCase } from '@/application/useCases/cuisines/ReplaceRestaurantCuisinesUseCase.js'
import { CreateCustomerAddressUseCase } from '@/application/useCases/customerAddresses/CreateCustomerAddressUseCase.js'
import { DeleteCustomerAddressUseCase } from '@/application/useCases/customerAddresses/DeleteCustomerAddressUseCase.js'
import { ListCustomerAddressesUseCase } from '@/application/useCases/customerAddresses/ListCustomerAddressesUseCase.js'
import { SetDefaultCustomerAddressUseCase } from '@/application/useCases/customerAddresses/SetDefaultCustomerAddressUseCase.js'
import { UpdateCustomerAddressUseCase } from '@/application/useCases/customerAddresses/UpdateCustomerAddressUseCase.js'
import { ConfirmDeliveryUseCase } from '@/application/useCases/deliveries/ConfirmDeliveryUseCase.js'
import { FailDeliveryUseCase } from '@/application/useCases/deliveries/FailDeliveryUseCase.js'
import { ListMyDeliveriesUseCase } from '@/application/useCases/deliveries/ListMyDeliveriesUseCase.js'
import { GetPublicMenuUseCase } from '@/application/useCases/discovery/GetPublicMenuUseCase.js'
import { GetPublicRestaurantUseCase } from '@/application/useCases/discovery/GetPublicRestaurantUseCase.js'
import { ListPublicReviewsUseCase } from '@/application/useCases/discovery/ListPublicReviewsUseCase.js'
import { ListRestaurantsUseCase } from '@/application/useCases/discovery/ListRestaurantsUseCase.js'
import { CreateMemberUseCase } from '@/application/useCases/members/CreateMemberUseCase.js'
import { ListMembersUseCase } from '@/application/useCases/members/ListMembersUseCase.js'
import { ListMyRestaurantsUseCase } from '@/application/useCases/members/ListMyRestaurantsUseCase.js'
import { UpdateMemberUseCase } from '@/application/useCases/members/UpdateMemberUseCase.js'
import { ArchiveMenuCategoryUseCase } from '@/application/useCases/menuCategories/ArchiveMenuCategoryUseCase.js'
import { CreateMenuCategoryUseCase } from '@/application/useCases/menuCategories/CreateMenuCategoryUseCase.js'
import { ListMenuCategoriesUseCase } from '@/application/useCases/menuCategories/ListMenuCategoriesUseCase.js'
import { ReorderMenuCategoriesUseCase } from '@/application/useCases/menuCategories/ReorderMenuCategoriesUseCase.js'
import { UpdateMenuCategoryUseCase } from '@/application/useCases/menuCategories/UpdateMenuCategoryUseCase.js'
import { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import { ListOpeningHoursUseCase } from '@/application/useCases/openingHours/ListOpeningHoursUseCase.js'
import { ReplaceOpeningHoursUseCase } from '@/application/useCases/openingHours/ReplaceOpeningHoursUseCase.js'
import { CancelOrderUseCase } from '@/application/useCases/orders/CancelOrderUseCase.js'
import { ChangeOrderStatusUseCase } from '@/application/useCases/orders/ChangeOrderStatusUseCase.js'
import { CreateOrderUseCase } from '@/application/useCases/orders/CreateOrderUseCase.js'
import { DispatchOrderUseCase } from '@/application/useCases/orders/DispatchOrderUseCase.js'
import { GetCustomerOrderUseCase } from '@/application/useCases/orders/GetCustomerOrderUseCase.js'
import { ListCustomerOrdersUseCase } from '@/application/useCases/orders/ListCustomerOrdersUseCase.js'
import { ListRestaurantOrdersUseCase } from '@/application/useCases/orders/ListRestaurantOrdersUseCase.js'
import { CreatePixPaymentUseCase } from '@/application/useCases/payments/CreatePixPaymentUseCase.js'
import { GetOrderPaymentUseCase } from '@/application/useCases/payments/GetOrderPaymentUseCase.js'
import { ProcessPaymentWebhookUseCase } from '@/application/useCases/payments/ProcessPaymentWebhookUseCase.js'
import { SettlePendingChargesUseCase } from '@/application/useCases/payments/SettlePendingChargesUseCase.js'
import { ArchiveProductUseCase } from '@/application/useCases/products/ArchiveProductUseCase.js'
import { CreateProductUseCase } from '@/application/useCases/products/CreateProductUseCase.js'
import { ListProductsUseCase } from '@/application/useCases/products/ListProductsUseCase.js'
import { ReorderProductsUseCase } from '@/application/useCases/products/ReorderProductsUseCase.js'
import { SetProductAvailabilityUseCase } from '@/application/useCases/products/SetProductAvailabilityUseCase.js'
import { UpdateProductUseCase } from '@/application/useCases/products/UpdateProductUseCase.js'
import { UpdateCustomerProfileUseCase } from '@/application/useCases/profile/UpdateCustomerProfileUseCase.js'
import { UpdateRestaurantUserProfileUseCase } from '@/application/useCases/profile/UpdateRestaurantUserProfileUseCase.js'
import { RegisterPushTokenUseCase } from '@/application/useCases/pushTokens/RegisterPushTokenUseCase.js'
import { UnregisterPushTokenUseCase } from '@/application/useCases/pushTokens/UnregisterPushTokenUseCase.js'
import { ActivateRestaurantUseCase } from '@/application/useCases/restaurants/ActivateRestaurantUseCase.js'
import { CreateRestaurantUseCase } from '@/application/useCases/restaurants/CreateRestaurantUseCase.js'
import { GetActivationChecklistUseCase } from '@/application/useCases/restaurants/GetActivationChecklistUseCase.js'
import { GetRestaurantUseCase } from '@/application/useCases/restaurants/GetRestaurantUseCase.js'
import { SetAcceptingOrdersUseCase } from '@/application/useCases/restaurants/SetAcceptingOrdersUseCase.js'
import { UpdateRestaurantUseCase } from '@/application/useCases/restaurants/UpdateRestaurantUseCase.js'
import { CreateReviewUseCase } from '@/application/useCases/reviews/CreateReviewUseCase.js'
import { GetOrderReviewUseCase } from '@/application/useCases/reviews/GetOrderReviewUseCase.js'
import { ListRestaurantReviewsUseCase } from '@/application/useCases/reviews/ListRestaurantReviewsUseCase.js'
import { ReplyToReviewUseCase } from '@/application/useCases/reviews/ReplyToReviewUseCase.js'
import { CreateImageUploadUseCase } from '@/application/useCases/uploads/CreateImageUploadUseCase.js'
import { ProcessImageVariantsUseCase } from '@/application/useCases/uploads/ProcessImageVariantsUseCase.js'
import { awsCredentials } from '@/config/aws.js'
import type { Env } from '@/config/env.js'
import { createDatabaseConnection, type IDatabaseConnection } from '@/db/client.js'
import { AbacatePayPaymentGateway } from '@/infra/gateways/AbacatePayPaymentGateway.js'
import { CognitoAuthGateway } from '@/infra/gateways/CognitoAuthGateway.js'
import { CognitoTokenVerifier } from '@/infra/gateways/CognitoTokenVerifier.js'
import { ExpoPushGateway } from '@/infra/gateways/ExpoPushGateway.js'
import { S3StorageGateway } from '@/infra/gateways/S3StorageGateway.js'
import { SharpImageProcessor } from '@/infra/gateways/SharpImageProcessor.js'
import { DrizzleAnalyticsRepository } from '@/infra/repositories/DrizzleAnalyticsRepository.js'
import { DrizzleCuisinesRepository } from '@/infra/repositories/DrizzleCuisinesRepository.js'
import { DrizzleCustomerAddressesRepository } from '@/infra/repositories/DrizzleCustomerAddressesRepository.js'
import { DrizzleCustomersRepository } from '@/infra/repositories/DrizzleCustomersRepository.js'
import { DrizzleMembershipsRepository } from '@/infra/repositories/DrizzleMembershipsRepository.js'
import { DrizzleMenuCategoriesRepository } from '@/infra/repositories/DrizzleMenuCategoriesRepository.js'
import { DrizzleOpeningHoursRepository } from '@/infra/repositories/DrizzleOpeningHoursRepository.js'
import { DrizzleOrdersRepository } from '@/infra/repositories/DrizzleOrdersRepository.js'
import { DrizzleOutboxRepository } from '@/infra/repositories/DrizzleOutboxRepository.js'
import { DrizzlePaymentsRepository } from '@/infra/repositories/DrizzlePaymentsRepository.js'
import { DrizzleProductsRepository } from '@/infra/repositories/DrizzleProductsRepository.js'
import { DrizzlePushTokensRepository } from '@/infra/repositories/DrizzlePushTokensRepository.js'
import { DrizzleRestaurantsRepository } from '@/infra/repositories/DrizzleRestaurantsRepository.js'
import { DrizzleRestaurantUsersRepository } from '@/infra/repositories/DrizzleRestaurantUsersRepository.js'
import { DrizzleReviewsRepository } from '@/infra/repositories/DrizzleReviewsRepository.js'
import { InMemoryOrderStream } from '@/infra/streams/InMemoryOrderStream.js'
import { TOKENS } from './tokens.js'

const SINGLETONS: [symbol, new (...args: never[]) => unknown][] = [
  [TOKENS.CustomersRepository, DrizzleCustomersRepository],
  [TOKENS.CustomerAddressesRepository, DrizzleCustomerAddressesRepository],
  [TOKENS.RestaurantUsersRepository, DrizzleRestaurantUsersRepository],
  [TOKENS.MembershipsRepository, DrizzleMembershipsRepository],
  [TOKENS.RestaurantsRepository, DrizzleRestaurantsRepository],
  [TOKENS.OpeningHoursRepository, DrizzleOpeningHoursRepository],
  [TOKENS.CuisinesRepository, DrizzleCuisinesRepository],
  [TOKENS.SignUpCustomerUseCase, SignUpCustomerUseCase],
  [TOKENS.SignInCustomerUseCase, SignInCustomerUseCase],
  [TOKENS.SignUpRestaurantUserUseCase, SignUpRestaurantUserUseCase],
  [TOKENS.SignInRestaurantUserUseCase, SignInRestaurantUserUseCase],
  [TOKENS.CreateMemberUseCase, CreateMemberUseCase],
  [TOKENS.ListMyRestaurantsUseCase, ListMyRestaurantsUseCase],
  [TOKENS.CreateRestaurantUseCase, CreateRestaurantUseCase],
  [TOKENS.GetRestaurantUseCase, GetRestaurantUseCase],
  [TOKENS.ListRestaurantsUseCase, ListRestaurantsUseCase],
  [TOKENS.GetPublicRestaurantUseCase, GetPublicRestaurantUseCase],
  [TOKENS.GetPublicMenuUseCase, GetPublicMenuUseCase],
  [TOKENS.UpdateRestaurantUseCase, UpdateRestaurantUseCase],
  [TOKENS.ActivateRestaurantUseCase, ActivateRestaurantUseCase],
  [TOKENS.GetActivationChecklistUseCase, GetActivationChecklistUseCase],
  [TOKENS.SetAcceptingOrdersUseCase, SetAcceptingOrdersUseCase],
  [TOKENS.UpdateCustomerProfileUseCase, UpdateCustomerProfileUseCase],
  [TOKENS.UpdateRestaurantUserProfileUseCase, UpdateRestaurantUserProfileUseCase],
  [TOKENS.ListOpeningHoursUseCase, ListOpeningHoursUseCase],
  [TOKENS.ReplaceOpeningHoursUseCase, ReplaceOpeningHoursUseCase],
  [TOKENS.ListCuisineCategoriesUseCase, ListCuisineCategoriesUseCase],
  [TOKENS.ListRestaurantCuisinesUseCase, ListRestaurantCuisinesUseCase],
  [TOKENS.ReplaceRestaurantCuisinesUseCase, ReplaceRestaurantCuisinesUseCase],
  [TOKENS.MenuCategoriesRepository, DrizzleMenuCategoriesRepository],
  [TOKENS.ListMenuCategoriesUseCase, ListMenuCategoriesUseCase],
  [TOKENS.CreateMenuCategoryUseCase, CreateMenuCategoryUseCase],
  [TOKENS.UpdateMenuCategoryUseCase, UpdateMenuCategoryUseCase],
  [TOKENS.ArchiveMenuCategoryUseCase, ArchiveMenuCategoryUseCase],
  [TOKENS.ReorderMenuCategoriesUseCase, ReorderMenuCategoriesUseCase],
  [TOKENS.ProductsRepository, DrizzleProductsRepository],
  [TOKENS.ListProductsUseCase, ListProductsUseCase],
  [TOKENS.CreateProductUseCase, CreateProductUseCase],
  [TOKENS.UpdateProductUseCase, UpdateProductUseCase],
  [TOKENS.SetProductAvailabilityUseCase, SetProductAvailabilityUseCase],
  [TOKENS.ReorderProductsUseCase, ReorderProductsUseCase],
  [TOKENS.ArchiveProductUseCase, ArchiveProductUseCase],
  [TOKENS.ListCustomerAddressesUseCase, ListCustomerAddressesUseCase],
  [TOKENS.CreateCustomerAddressUseCase, CreateCustomerAddressUseCase],
  [TOKENS.UpdateCustomerAddressUseCase, UpdateCustomerAddressUseCase],
  [TOKENS.SetDefaultCustomerAddressUseCase, SetDefaultCustomerAddressUseCase],
  [TOKENS.DeleteCustomerAddressUseCase, DeleteCustomerAddressUseCase],
  [TOKENS.PushTokensRepository, DrizzlePushTokensRepository],
  [TOKENS.NotifyOrderChangeUseCase, NotifyOrderChangeUseCase],
  [TOKENS.RegisterPushTokenUseCase, RegisterPushTokenUseCase],
  [TOKENS.UnregisterPushTokenUseCase, UnregisterPushTokenUseCase],
  [TOKENS.OrdersRepository, DrizzleOrdersRepository],
  [TOKENS.PaymentsRepository, DrizzlePaymentsRepository],
  [TOKENS.CreateOrderUseCase, CreateOrderUseCase],
  [TOKENS.ListCustomerOrdersUseCase, ListCustomerOrdersUseCase],
  [TOKENS.GetCustomerOrderUseCase, GetCustomerOrderUseCase],
  [TOKENS.CancelOrderUseCase, CancelOrderUseCase],
  [TOKENS.CreatePixPaymentUseCase, CreatePixPaymentUseCase],
  [TOKENS.GetOrderPaymentUseCase, GetOrderPaymentUseCase],
  [TOKENS.ProcessPaymentWebhookUseCase, ProcessPaymentWebhookUseCase],
  [TOKENS.SettlePendingChargesUseCase, SettlePendingChargesUseCase],
  [TOKENS.ListRestaurantOrdersUseCase, ListRestaurantOrdersUseCase],
  [TOKENS.ChangeOrderStatusUseCase, ChangeOrderStatusUseCase],
  [TOKENS.DispatchOrderUseCase, DispatchOrderUseCase],
  [TOKENS.ListMembersUseCase, ListMembersUseCase],
  [TOKENS.UpdateMemberUseCase, UpdateMemberUseCase],
  [TOKENS.ListMyDeliveriesUseCase, ListMyDeliveriesUseCase],
  [TOKENS.ConfirmDeliveryUseCase, ConfirmDeliveryUseCase],
  [TOKENS.FailDeliveryUseCase, FailDeliveryUseCase],
  [TOKENS.ReviewsRepository, DrizzleReviewsRepository],
  [TOKENS.CreateReviewUseCase, CreateReviewUseCase],
  [TOKENS.GetOrderReviewUseCase, GetOrderReviewUseCase],
  [TOKENS.ReplyToReviewUseCase, ReplyToReviewUseCase],
  [TOKENS.ListRestaurantReviewsUseCase, ListRestaurantReviewsUseCase],
  [TOKENS.ListPublicReviewsUseCase, ListPublicReviewsUseCase],
  [TOKENS.OutboxRepository, DrizzleOutboxRepository],
  [TOKENS.AnalyticsRepository, DrizzleAnalyticsRepository],
  [TOKENS.ProcessOrderEventUseCase, ProcessOrderEventUseCase],
  [TOKENS.GetAnalyticsUseCase, GetAnalyticsUseCase],
  [TOKENS.CreateImageUploadUseCase, CreateImageUploadUseCase],
  [TOKENS.ProcessImageVariantsUseCase, ProcessImageVariantsUseCase]
]

export interface IAdapters {
  customerTokenVerifier: ITokenVerifier
  restaurantTokenVerifier: ITokenVerifier
  customerAuthGateway: IAuthGateway
  restaurantAuthGateway: IAuthGateway
  storageGateway: IStorageGateway
  imageProcessor: IImageProcessor
  paymentGateway: IPaymentGateway
  pushGateway: IPushGateway
}

export function buildAdapters(env: Env): IAdapters {
  const credentials = awsCredentials(env)

  return {
    // Dois pools, dois verificadores. Um token do app de cliente não passa no verificador do
    // dashboard porque o issuer e o audience são de outro pool.
    customerTokenVerifier: new CognitoTokenVerifier(
      env.COGNITO_CUSTOMER_POOL_ID,
      env.COGNITO_CUSTOMER_CLIENT_ID
    ),
    restaurantTokenVerifier: new CognitoTokenVerifier(
      env.COGNITO_RESTAURANT_POOL_ID,
      env.COGNITO_RESTAURANT_CLIENT_ID
    ),
    customerAuthGateway: new CognitoAuthGateway(
      env.COGNITO_CUSTOMER_POOL_ID,
      env.COGNITO_CUSTOMER_CLIENT_ID,
      env.AWS_REGION,
      credentials
    ),
    restaurantAuthGateway: new CognitoAuthGateway(
      env.COGNITO_RESTAURANT_POOL_ID,
      env.COGNITO_RESTAURANT_CLIENT_ID,
      env.AWS_REGION,
      credentials
    ),
    storageGateway: new S3StorageGateway(env.S3_BUCKET, env.AWS_REGION, credentials),
    imageProcessor: new SharpImageProcessor(),
    paymentGateway: new AbacatePayPaymentGateway(env.ABACATEPAY_API_URL, env.ABACATEPAY_API_KEY),
    pushGateway: new ExpoPushGateway(env.EXPO_ACCESS_TOKEN)
  }
}

export function buildContainer(
  env: Env,
  adapters: IAdapters = buildAdapters(env)
): DependencyContainer {
  const container = rootContainer.createChildContainer()

  const database = createDatabaseConnection(env.DATABASE_URL)
  container.register<IDatabaseConnection>(TOKENS.Database, { useValue: database })

  const { customerAuthGateway, restaurantAuthGateway } = adapters

  container.register<ITokenVerifier>(TOKENS.CustomerTokenVerifier, {
    useValue: adapters.customerTokenVerifier
  })
  container.register<ITokenVerifier>(TOKENS.RestaurantTokenVerifier, {
    useValue: adapters.restaurantTokenVerifier
  })
  container.register<IAuthGateway>(TOKENS.CustomerAuthGateway, { useValue: customerAuthGateway })
  container.register<IAuthGateway>(TOKENS.RestaurantAuthGateway, {
    useValue: restaurantAuthGateway
  })
  container.register<IStorageGateway>(TOKENS.StorageGateway, { useValue: adapters.storageGateway })
  container.register<IImageProcessor>(TOKENS.ImageProcessor, { useValue: adapters.imageProcessor })
  container.register<IPaymentGateway>(TOKENS.PaymentGateway, { useValue: adapters.paymentGateway })
  container.register<IPushGateway>(TOKENS.PushGateway, { useValue: adapters.pushGateway })

  container.register<string>(TOKENS.MediaBaseUrl, { useValue: env.MEDIA_BASE_URL })

  container.register<string>(TOKENS.PaymentWebhookSecret, {
    useValue: env.ABACATEPAY_WEBHOOK_SECRET
  })

  container.register<number>(TOKENS.PixExpiresInSeconds, {
    useValue: env.PAYMENT_PIX_EXPIRES_IN_SECONDS
  })

  // O stream vive na memória do processo: só entrega aos SSE abertos nesta instância da API.
  // Num worker ele existe e não tem ouvintes — o dashboard vê aquela mudança no próximo refetch.
  container.register<IOrderStream>(TOKENS.OrderStream, { useValue: new InMemoryOrderStream() })

  container.register(TOKENS.RefreshCustomerSessionUseCase, {
    useValue: new RefreshSessionUseCase(customerAuthGateway)
  })

  container.register(TOKENS.RefreshRestaurantSessionUseCase, {
    useValue: new RefreshSessionUseCase(restaurantAuthGateway)
  })

  container.register(TOKENS.ForgotCustomerPasswordUseCase, {
    useValue: new ForgotPasswordUseCase(customerAuthGateway)
  })

  container.register(TOKENS.ResetCustomerPasswordUseCase, {
    useValue: new ResetPasswordUseCase(customerAuthGateway)
  })

  container.register(TOKENS.ForgotRestaurantPasswordUseCase, {
    useValue: new ForgotPasswordUseCase(restaurantAuthGateway)
  })

  container.register(TOKENS.ResetRestaurantPasswordUseCase, {
    useValue: new ResetPasswordUseCase(restaurantAuthGateway)
  })

  for (const [token, implementation] of SINGLETONS) {
    container.register(token, { useClass: implementation }, { lifecycle: Lifecycle.Singleton })
  }

  return container
}
