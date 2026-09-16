export const TOKENS = {
  Database: Symbol('Database'),

  CustomerTokenVerifier: Symbol('CustomerTokenVerifier'),
  RestaurantTokenVerifier: Symbol('RestaurantTokenVerifier'),
  CustomerAuthGateway: Symbol('CustomerAuthGateway'),
  RestaurantAuthGateway: Symbol('RestaurantAuthGateway'),

  CustomersRepository: Symbol('CustomersRepository'),
  RestaurantUsersRepository: Symbol('RestaurantUsersRepository'),
  MembershipsRepository: Symbol('MembershipsRepository'),

  SignUpCustomerUseCase: Symbol('SignUpCustomerUseCase'),
  SignInCustomerUseCase: Symbol('SignInCustomerUseCase'),
  RefreshCustomerSessionUseCase: Symbol('RefreshCustomerSessionUseCase'),
  RefreshRestaurantSessionUseCase: Symbol('RefreshRestaurantSessionUseCase'),
  SignUpRestaurantUserUseCase: Symbol('SignUpRestaurantUserUseCase'),
  SignInRestaurantUserUseCase: Symbol('SignInRestaurantUserUseCase'),
  CreateMemberUseCase: Symbol('CreateMemberUseCase'),
  ListMyRestaurantsUseCase: Symbol('ListMyRestaurantsUseCase')
} as const
