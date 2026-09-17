export interface ICustomerAddress {
  id: string
  label: string | null
  zipCode: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  reference: string | null
  isDefault: boolean
}

export interface ICreateCustomerAddressData {
  customerId: string
  label?: string | undefined
  zipCode: string
  street: string
  number: string
  complement?: string | undefined
  neighborhood: string
  city: string
  state: string
  reference?: string | undefined
  isDefault?: boolean | undefined
}

export interface IUpdateCustomerAddressData {
  label?: string | null | undefined
  zipCode?: string | undefined
  street?: string | undefined
  number?: string | undefined
  complement?: string | null | undefined
  neighborhood?: string | undefined
  city?: string | undefined
  state?: string | undefined
  reference?: string | null | undefined
}

export interface ICustomerAddressesRepository {
  listByCustomer(customerId: string): Promise<ICustomerAddress[]>

  findById(customerId: string, id: string): Promise<ICustomerAddress | null>

  create(data: ICreateCustomerAddressData): Promise<ICustomerAddress>

  update(
    customerId: string,
    id: string,
    data: IUpdateCustomerAddressData
  ): Promise<ICustomerAddress>

  setDefault(customerId: string, id: string): Promise<ICustomerAddress>

  delete(customerId: string, id: string): Promise<void>
}
