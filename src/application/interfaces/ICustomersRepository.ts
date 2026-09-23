export interface IAuthenticatedCustomer {
  id: string
  cognitoSub: string
  name: string
  email: string
  phone: string | null
}

export interface IUpdateCustomerProfileData {
  name?: string | undefined
  phone?: string | null | undefined
}

export interface ICreateCustomerData {
  cognitoSub: string
  name: string
  email: string
  phone?: string | undefined
}

export interface ICustomersRepository {
  findByCognitoSub(cognitoSub: string): Promise<IAuthenticatedCustomer | null>

  findByEmail(email: string): Promise<IAuthenticatedCustomer | null>

  updateProfile(id: string, data: IUpdateCustomerProfileData): Promise<IAuthenticatedCustomer>

  create(data: ICreateCustomerData): Promise<IAuthenticatedCustomer>
}
