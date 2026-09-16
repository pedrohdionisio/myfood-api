export const TOKENS = {
  Database: Symbol('Database'),

  CustomerTokenVerifier: Symbol('CustomerTokenVerifier'),
  RestaurantTokenVerifier: Symbol('RestaurantTokenVerifier'),
  CustomerAuthGateway: Symbol('CustomerAuthGateway'),
  RestaurantAuthGateway: Symbol('RestaurantAuthGateway'),

  CustomersRepository: Symbol('CustomersRepository'),
  RestaurantUsersRepository: Symbol('RestaurantUsersRepository'),
  MembershipsRepository: Symbol('MembershipsRepository'),
  RestaurantsRepository: Symbol('RestaurantsRepository'),
  OpeningHoursRepository: Symbol('OpeningHoursRepository'),
  CuisinesRepository: Symbol('CuisinesRepository'),

  SignUpCustomerUseCase: Symbol('SignUpCustomerUseCase'),
  SignInCustomerUseCase: Symbol('SignInCustomerUseCase'),
  RefreshCustomerSessionUseCase: Symbol('RefreshCustomerSessionUseCase'),
  RefreshRestaurantSessionUseCase: Symbol('RefreshRestaurantSessionUseCase'),
  SignUpRestaurantUserUseCase: Symbol('SignUpRestaurantUserUseCase'),
  SignInRestaurantUserUseCase: Symbol('SignInRestaurantUserUseCase'),
  CreateMemberUseCase: Symbol('CreateMemberUseCase'),
  ListMyRestaurantsUseCase: Symbol('ListMyRestaurantsUseCase'),
  CreateRestaurantUseCase: Symbol('CreateRestaurantUseCase'),
  GetRestaurantUseCase: Symbol('GetRestaurantUseCase'),
  UpdateRestaurantUseCase: Symbol('UpdateRestaurantUseCase'),
  ListOpeningHoursUseCase: Symbol('ListOpeningHoursUseCase'),
  ReplaceOpeningHoursUseCase: Symbol('ReplaceOpeningHoursUseCase'),
  ListCuisineCategoriesUseCase: Symbol('ListCuisineCategoriesUseCase'),
  ListRestaurantCuisinesUseCase: Symbol('ListRestaurantCuisinesUseCase'),
  ReplaceRestaurantCuisinesUseCase: Symbol('ReplaceRestaurantCuisinesUseCase')
} as const
