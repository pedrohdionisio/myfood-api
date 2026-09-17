import type { DependencyContainer } from 'tsyringe'
import type { CreateCustomerAddressUseCase } from '@/application/useCases/customerAddresses/CreateCustomerAddressUseCase.js'
import type { DeleteCustomerAddressUseCase } from '@/application/useCases/customerAddresses/DeleteCustomerAddressUseCase.js'
import type { ListCustomerAddressesUseCase } from '@/application/useCases/customerAddresses/ListCustomerAddressesUseCase.js'
import type { SetDefaultCustomerAddressUseCase } from '@/application/useCases/customerAddresses/SetDefaultCustomerAddressUseCase.js'
import type { UpdateCustomerAddressUseCase } from '@/application/useCases/customerAddresses/UpdateCustomerAddressUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import {
  createCustomerAddressBodySchema,
  customerAddressesResponseSchema,
  customerAddressParamsSchema,
  customerAddressResponseSchema,
  updateCustomerAddressBodySchema
} from '@/schemas/customer-addresses.js'
import type { App } from '../app.js'
import { requireCustomer } from '../plugins/auth.js'

export function registerCustomerAddressRoutes(app: App, container: DependencyContainer): void {
  const listAddresses = container.resolve<ListCustomerAddressesUseCase>(
    TOKENS.ListCustomerAddressesUseCase
  )
  const createAddress = container.resolve<CreateCustomerAddressUseCase>(
    TOKENS.CreateCustomerAddressUseCase
  )
  const updateAddress = container.resolve<UpdateCustomerAddressUseCase>(
    TOKENS.UpdateCustomerAddressUseCase
  )
  const setDefaultAddress = container.resolve<SetDefaultCustomerAddressUseCase>(
    TOKENS.SetDefaultCustomerAddressUseCase
  )
  const deleteAddress = container.resolve<DeleteCustomerAddressUseCase>(
    TOKENS.DeleteCustomerAddressUseCase
  )

  app.get(
    '/customers/me/addresses',
    {
      schema: {
        tags: ['customers'],
        summary: 'Endereços do cliente, o padrão primeiro',
        response: { 200: customerAddressesResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => listAddresses.execute(requireCustomer(request).id)
  )

  app.post(
    '/customers/me/addresses',
    {
      schema: {
        tags: ['customers'],
        summary: 'Cliente cadastra um endereço; o primeiro vira o padrão',
        body: createCustomerAddressBodySchema,
        response: { 201: customerAddressResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request, reply) => {
      const address = await createAddress.execute({
        customerId: requireCustomer(request).id,
        ...request.body
      })

      return reply.status(201).send(address)
    }
  )

  app.patch(
    '/customers/me/addresses/:addressId',
    {
      schema: {
        tags: ['customers'],
        summary: 'Cliente edita um endereço',
        params: customerAddressParamsSchema,
        body: updateCustomerAddressBodySchema,
        response: { 200: customerAddressResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) =>
      updateAddress.execute(requireCustomer(request).id, request.params.addressId, request.body)
  )

  app.patch(
    '/customers/me/addresses/:addressId/default',
    {
      schema: {
        tags: ['customers'],
        summary: 'Cliente escolhe o endereço padrão',
        params: customerAddressParamsSchema,
        response: { 200: customerAddressResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) =>
      setDefaultAddress.execute(requireCustomer(request).id, request.params.addressId)
  )

  app.delete(
    '/customers/me/addresses/:addressId',
    {
      schema: {
        tags: ['customers'],
        summary: 'Cliente apaga um endereço e recebe a lista que sobrou',
        params: customerAddressParamsSchema,
        response: { 200: customerAddressesResponseSchema }
      },
      preHandler: [app.authenticateCustomer]
    },
    async (request) => deleteAddress.execute(requireCustomer(request).id, request.params.addressId)
  )
}
