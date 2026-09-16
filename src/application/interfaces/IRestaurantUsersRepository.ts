export interface IAuthenticatedRestaurantUser {
  id: string
  cognitoSub: string
  name: string
  email: string
}

export interface ICreateRestaurantUserData {
  cognitoSub: string
  name: string
  email: string
  phone?: string | undefined
}

export interface IRestaurantUsersRepository {
  findByCognitoSub(cognitoSub: string): Promise<IAuthenticatedRestaurantUser | null>

  findByEmail(email: string): Promise<IAuthenticatedRestaurantUser | null>

  create(data: ICreateRestaurantUserData): Promise<IAuthenticatedRestaurantUser>
}
