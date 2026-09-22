import { type DependencyContainer, Lifecycle, container as rootContainer } from 'tsyringe'
import type { IAnalyticsRepository } from '@/application/interfaces/IAnalyticsRepository.js'
import type { IAuthGateway } from '@/application/interfaces/IAuthGateway.js'
import type { ICuisinesRepository } from '@/application/interfaces/ICuisinesRepository.js'
import type { ICustomerAddressesRepository } from '@/application/interfaces/ICustomerAddressesRepository.js'
import type { ICustomersRepository } from '@/application/interfaces/ICustomersRepository.js'
import type { IImageProcessor } from '@/application/interfaces/IImageProcessor.js'
import type { IMembershipsRepository } from '@/application/interfaces/IMembershipsRepository.js'
import type { IMenuCategoriesRepository } from '@/application/interfaces/IMenuCategoriesRepository.js'
import type { IOpeningHoursRepository } from '@/application/interfaces/IOpeningHoursRepository.js'
import type { IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import type { IOutboxRepository } from '@/application/interfaces/IOutboxRepository.js'
import type { IPaymentGateway } from '@/application/interfaces/IPaymentGateway.js'
import type { IPaymentsRepository } from '@/application/interfaces/IPaymentsRepository.js'
import type { IProductsRepository } from '@/application/interfaces/IProductsRepository.js'
import type { IRestaurantsRepository } from '@/application/interfaces/IRestaurantsRepository.js'
import type { IRestaurantUsersRepository } from '@/application/interfaces/IRestaurantUsersRepository.js'
import type { IReviewsRepository } from '@/application/interfaces/IReviewsRepository.js'
import type { IStorageGateway } from '@/application/interfaces/IStorageGateway.js'
import type { ITokenVerifier } from '@/application/interfaces/ITokenVerifier.js'
import { GetAnalyticsUseCase } from '@/application/useCases/analytics/GetAnalyticsUseCase.js'
import { ProcessOrderEventUseCase } from '@/application/useCases/analytics/ProcessOrderEventUseCase.js'
import { RefreshSessionUseCase } from '@/application/useCases/auth/RefreshSessionUseCase.js'
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
import { SearchUseCase } from '@/application/useCases/discovery/SearchUseCase.js'
import { CreateMemberUseCase } from '@/application/useCases/members/CreateMemberUseCase.js'
import { ListMembersUseCase } from '@/application/useCases/members/ListMembersUseCase.js'
import { ListMyRestaurantsUseCase } from '@/application/useCases/members/ListMyRestaurantsUseCase.js'
import { ArchiveMenuCategoryUseCase } from '@/application/useCases/menuCategories/ArchiveMenuCategoryUseCase.js'
import { CreateMenuCategoryUseCase } from '@/application/useCases/menuCategories/CreateMenuCategoryUseCase.js'
import { ListMenuCategoriesUseCase } from '@/application/useCases/menuCategories/ListMenuCategoriesUseCase.js'
import { ReorderMenuCategoriesUseCase } from '@/application/useCases/menuCategories/ReorderMenuCategoriesUseCase.js'
import { UpdateMenuCategoryUseCase } from '@/application/useCases/menuCategories/UpdateMenuCategoryUseCase.js'
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
import type { Env } from '@/config/env.js'
import { createDatabaseConnection, type IDatabaseConnection } from '@/db/client.js'
import { AbacatePayPaymentGateway } from '@/infra/gateways/AbacatePayPaymentGateway.js'
import { CognitoAuthGateway } from '@/infra/gateways/CognitoAuthGateway.js'
import { CognitoTokenVerifier } from '@/infra/gateways/CognitoTokenVerifier.js'
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
import { DrizzleRestaurantsRepository } from '@/infra/repositories/DrizzleRestaurantsRepository.js'
import { DrizzleRestaurantUsersRepository } from '@/infra/repositories/DrizzleRestaurantUsersRepository.js'
import { DrizzleReviewsRepository } from '@/infra/repositories/DrizzleReviewsRepository.js'
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

  container.register<IStorageGateway>(TOKENS.StorageGateway, {
    useValue: new S3StorageGateway(env.S3_BUCKET, env.AWS_REGION, credentials)
  })

  container.register<IImageProcessor>(TOKENS.ImageProcessor, {
    useValue: new SharpImageProcessor()
  })

  container.register<string>(TOKENS.MediaBaseUrl, { useValue: env.MEDIA_BASE_URL })

  container.register<IPaymentGateway>(TOKENS.PaymentGateway, {
    useValue: new AbacatePayPaymentGateway(env.ABACATEPAY_API_URL, env.ABACATEPAY_API_KEY)
  })

  container.register<string>(TOKENS.PaymentWebhookSecret, {
    useValue: env.ABACATEPAY_WEBHOOK_SECRET
  })

  container.register<number>(TOKENS.PixExpiresInSeconds, {
    useValue: env.PAYMENT_PIX_EXPIRES_IN_SECONDS
  })

  container.register<ICustomersRepository>(
    TOKENS.CustomersRepository,
    { useClass: DrizzleCustomersRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<ICustomerAddressesRepository>(
    TOKENS.CustomerAddressesRepository,
    { useClass: DrizzleCustomerAddressesRepository },
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

  container.register<IRestaurantsRepository>(
    TOKENS.RestaurantsRepository,
    { useClass: DrizzleRestaurantsRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IOpeningHoursRepository>(
    TOKENS.OpeningHoursRepository,
    { useClass: DrizzleOpeningHoursRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<ICuisinesRepository>(
    TOKENS.CuisinesRepository,
    { useClass: DrizzleCuisinesRepository },
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

  container.register(
    TOKENS.CreateRestaurantUseCase,
    { useClass: CreateRestaurantUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.GetRestaurantUseCase,
    { useClass: GetRestaurantUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListRestaurantsUseCase,
    { useClass: ListRestaurantsUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.GetPublicRestaurantUseCase,
    { useClass: GetPublicRestaurantUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.GetPublicMenuUseCase,
    { useClass: GetPublicMenuUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.SearchUseCase,
    { useClass: SearchUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.UpdateRestaurantUseCase,
    { useClass: UpdateRestaurantUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ActivateRestaurantUseCase,
    { useClass: ActivateRestaurantUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.GetActivationChecklistUseCase,
    { useClass: GetActivationChecklistUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.SetAcceptingOrdersUseCase,
    { useClass: SetAcceptingOrdersUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListOpeningHoursUseCase,
    { useClass: ListOpeningHoursUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ReplaceOpeningHoursUseCase,
    { useClass: ReplaceOpeningHoursUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListCuisineCategoriesUseCase,
    { useClass: ListCuisineCategoriesUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListRestaurantCuisinesUseCase,
    { useClass: ListRestaurantCuisinesUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ReplaceRestaurantCuisinesUseCase,
    { useClass: ReplaceRestaurantCuisinesUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IMenuCategoriesRepository>(
    TOKENS.MenuCategoriesRepository,
    { useClass: DrizzleMenuCategoriesRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListMenuCategoriesUseCase,
    { useClass: ListMenuCategoriesUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CreateMenuCategoryUseCase,
    { useClass: CreateMenuCategoryUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.UpdateMenuCategoryUseCase,
    { useClass: UpdateMenuCategoryUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ArchiveMenuCategoryUseCase,
    { useClass: ArchiveMenuCategoryUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ReorderMenuCategoriesUseCase,
    { useClass: ReorderMenuCategoriesUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IProductsRepository>(
    TOKENS.ProductsRepository,
    { useClass: DrizzleProductsRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListProductsUseCase,
    { useClass: ListProductsUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CreateProductUseCase,
    { useClass: CreateProductUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.UpdateProductUseCase,
    { useClass: UpdateProductUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.SetProductAvailabilityUseCase,
    { useClass: SetProductAvailabilityUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ReorderProductsUseCase,
    { useClass: ReorderProductsUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ArchiveProductUseCase,
    { useClass: ArchiveProductUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListCustomerAddressesUseCase,
    { useClass: ListCustomerAddressesUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CreateCustomerAddressUseCase,
    { useClass: CreateCustomerAddressUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.UpdateCustomerAddressUseCase,
    { useClass: UpdateCustomerAddressUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.SetDefaultCustomerAddressUseCase,
    { useClass: SetDefaultCustomerAddressUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.DeleteCustomerAddressUseCase,
    { useClass: DeleteCustomerAddressUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IOrdersRepository>(
    TOKENS.OrdersRepository,
    { useClass: DrizzleOrdersRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IPaymentsRepository>(
    TOKENS.PaymentsRepository,
    { useClass: DrizzlePaymentsRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CreateOrderUseCase,
    { useClass: CreateOrderUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListCustomerOrdersUseCase,
    { useClass: ListCustomerOrdersUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.GetCustomerOrderUseCase,
    { useClass: GetCustomerOrderUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CancelOrderUseCase,
    { useClass: CancelOrderUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CreatePixPaymentUseCase,
    { useClass: CreatePixPaymentUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.GetOrderPaymentUseCase,
    { useClass: GetOrderPaymentUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ProcessPaymentWebhookUseCase,
    { useClass: ProcessPaymentWebhookUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.SettlePendingChargesUseCase,
    { useClass: SettlePendingChargesUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListRestaurantOrdersUseCase,
    { useClass: ListRestaurantOrdersUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ChangeOrderStatusUseCase,
    { useClass: ChangeOrderStatusUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.DispatchOrderUseCase,
    { useClass: DispatchOrderUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListMembersUseCase,
    { useClass: ListMembersUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListMyDeliveriesUseCase,
    { useClass: ListMyDeliveriesUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ConfirmDeliveryUseCase,
    { useClass: ConfirmDeliveryUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.FailDeliveryUseCase,
    { useClass: FailDeliveryUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IReviewsRepository>(
    TOKENS.ReviewsRepository,
    { useClass: DrizzleReviewsRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CreateReviewUseCase,
    { useClass: CreateReviewUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.GetOrderReviewUseCase,
    { useClass: GetOrderReviewUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ReplyToReviewUseCase,
    { useClass: ReplyToReviewUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListRestaurantReviewsUseCase,
    { useClass: ListRestaurantReviewsUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ListPublicReviewsUseCase,
    { useClass: ListPublicReviewsUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IOutboxRepository>(
    TOKENS.OutboxRepository,
    { useClass: DrizzleOutboxRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register<IAnalyticsRepository>(
    TOKENS.AnalyticsRepository,
    { useClass: DrizzleAnalyticsRepository },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ProcessOrderEventUseCase,
    { useClass: ProcessOrderEventUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.GetAnalyticsUseCase,
    { useClass: GetAnalyticsUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.CreateImageUploadUseCase,
    { useClass: CreateImageUploadUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  container.register(
    TOKENS.ProcessImageVariantsUseCase,
    { useClass: ProcessImageVariantsUseCase },
    { lifecycle: Lifecycle.Singleton }
  )

  return container
}
