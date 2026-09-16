export interface IAuthenticatedCustomer {
  id: string
  cognitoSub: string
  name: string
  email: string
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

  create(data: ICreateCustomerData): Promise<IAuthenticatedCustomer>
}
