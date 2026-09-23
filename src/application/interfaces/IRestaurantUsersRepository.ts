export interface IAuthenticatedRestaurantUser {
  id: string
  cognitoSub: string
  name: string
  email: string
  phone: string | null
}

export interface IUpdateRestaurantUserProfileData {
  name?: string | undefined
  phone?: string | null | undefined
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

  updateProfile(
    id: string,
    data: IUpdateRestaurantUserProfileData
  ): Promise<IAuthenticatedRestaurantUser>

  create(data: ICreateRestaurantUserData): Promise<IAuthenticatedRestaurantUser>
}
