import { inject, injectable } from 'tsyringe'
import type { ICustomerAddressesRepository } from '@/application/interfaces/ICustomerAddressesRepository.js'
import type { IOpeningHoursRepository } from '@/application/interfaces/IOpeningHoursRepository.js'
import type {
  ICreateOrderItemData,
  IOrder,
  IOrdersRepository
} from '@/application/interfaces/IOrdersRepository.js'
import type { IProduct, IProductsRepository } from '@/application/interfaces/IProductsRepository.js'
import type { IRestaurantsRepository } from '@/application/interfaces/IRestaurantsRepository.js'
import type { NotifyOrderChangeUseCase } from '@/application/useCases/notifications/NotifyOrderChangeUseCase.js'
import { TOKENS } from '@/di/tokens.js'
import { isSameCity } from '@/domain/address.js'
import { generateDeliveryCode, resolveDeliveryFee } from '@/domain/delivery.js'
import type { PaymentMethod } from '@/domain/enums.js'
import { DomainError, NotFoundError } from '@/domain/errors.js'
import { fingerprintCheckout, idempotencyWindowStart } from '@/domain/idempotency.js'
import { isOpenAt } from '@/domain/opening-hours.js'
import { initialOrderStatus } from '@/domain/order-status.js'
import { calculateLineTotal } from '@/domain/pricing.js'
import { BUSINESS_TIME_ZONE } from '@/domain/time.js'

export interface ICreateOrderItemInput {
  productId: string
  quantity: number
  notes?: string | undefined
}

export interface ICreateOrderInput {
  idempotencyKey: string
  customerId: string
  restaurantId: string
  addressId: string
  paymentMethod: PaymentMethod
  changeForCents?: number | undefined
  notes?: string | undefined
  items: ICreateOrderItemInput[]
}

@injectable()
export class CreateOrderUseCase {
  constructor(
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository,
    @inject(TOKENS.RestaurantsRepository)
    private readonly restaurants: IRestaurantsRepository,
    @inject(TOKENS.ProductsRepository)
    private readonly products: IProductsRepository,
    @inject(TOKENS.CustomerAddressesRepository)
    private readonly addresses: ICustomerAddressesRepository,
    @inject(TOKENS.OpeningHoursRepository)
    private readonly openingHours: IOpeningHoursRepository,
    @inject(TOKENS.NotifyOrderChangeUseCase)
    private readonly notify: NotifyOrderChangeUseCase
  ) {}

  async execute(input: ICreateOrderInput): Promise<IOrder> {
    const requestHash = fingerprintCheckout(input)
    const idempotencyClaimedAfter = idempotencyWindowStart(new Date())

    const replay = await this.orders.findIdempotentReplay(
      input.idempotencyKey,
      input.customerId,
      idempotencyClaimedAfter
    )

    if (replay) {
      if (replay.requestHash !== null && replay.requestHash !== requestHash) {
        throw new DomainError(
          `Idempotency-Key ${input.idempotencyKey} reusada com outro corpo de pedido.`,
          'Este checkout já gerou outro pedido. Volte ao carrinho e tente de novo.'
        )
      }

      return replay.order
    }

    const restaurant = await this.restaurants.findById(input.restaurantId)

    if (restaurant?.status !== 'ACTIVE') {
      throw new NotFoundError(`Restaurante ${input.restaurantId} não está ativo.`)
    }

    if (!restaurant.isAcceptingOrders) {
      throw new DomainError(
        `Restaurante ${restaurant.id} está com os pedidos pausados.`,
        'Este restaurante não está aceitando pedidos agora.'
      )
    }

    const shifts = await this.openingHours.listByRestaurant(restaurant.id)

    if (!isOpenAt(shifts, new Date(), BUSINESS_TIME_ZONE)) {
      throw new DomainError(
        `Restaurante ${restaurant.id} está fora do horário de funcionamento.`,
        'Este restaurante está fechado agora.'
      )
    }

    const address = await this.addresses.findById(input.customerId, input.addressId)

    if (!address) {
      throw new NotFoundError(
        `Endereço ${input.addressId} não encontrado para o cliente ${input.customerId}.`
      )
    }

    if (!isSameCity(address, restaurant)) {
      throw new DomainError(
        `Endereço em ${address.city}/${address.state} e restaurante em ${restaurant.city}/${restaurant.state}.`,
        'Este restaurante não entrega na cidade do endereço escolhido.'
      )
    }

    const items = this.buildItems(input.items, await this.loadProducts(input))
    const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0)

    if (subtotalCents < restaurant.minOrderCents) {
      throw new DomainError(
        `Subtotal ${subtotalCents} abaixo do mínimo ${restaurant.minOrderCents}.`,
        'O valor dos itens está abaixo do pedido mínimo deste restaurante.',
        { minOrderCents: restaurant.minOrderCents, subtotalCents }
      )
    }

    const deliveryFeeCents = resolveDeliveryFee(restaurant)
    const totalCents = subtotalCents + deliveryFeeCents

    this.assertPayment(input, totalCents)

    const order = await this.orders.create({
      idempotencyKey: input.idempotencyKey,
      requestHash,
      idempotencyClaimedAfter,
      customerId: input.customerId,
      restaurantId: restaurant.id,
      status: initialOrderStatus(input.paymentMethod),
      paymentMethod: input.paymentMethod,
      changeForCents: input.changeForCents,
      subtotalCents,
      deliveryFeeCents,
      totalCents,
      deliveryCode: generateDeliveryCode(),
      notes: input.notes,
      deliveryZipCode: address.zipCode,
      deliveryStreet: address.street,
      deliveryNumber: address.number,
      deliveryComplement: address.complement ?? undefined,
      deliveryNeighborhood: address.neighborhood,
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryReference: address.reference ?? undefined,
      items
    })

    // Pedido em dinheiro já nasce visível ao restaurante; o online só aparece quando o Pix
    // confirma, e é o webhook que avisa (§12).
    await this.notify.execute({ change: 'PLACED', actor: 'CUSTOMER', order })

    return order
  }

  private async loadProducts(input: ICreateOrderInput): Promise<Map<string, IProduct>> {
    const requested = input.items.map((item) => item.productId)
    const found = await this.products.listByIds(input.restaurantId, requested)
    const byId = new Map(found.map((product) => [product.id, product]))

    const missing = requested.filter((id) => !byId.has(id))

    if (missing.length > 0) {
      throw new DomainError(
        `Produtos fora do cardápio ativo do restaurante ${input.restaurantId}: ${missing.join(', ')}.`,
        'Um item do seu carrinho saiu do cardápio. Revise o pedido.',
        { productIds: missing }
      )
    }

    const unavailable = found.filter((product) => !product.isAvailable)

    if (unavailable.length > 0) {
      throw new DomainError(
        `Produtos esgotados: ${unavailable.map((product) => product.id).join(', ')}.`,
        `Sem estoque agora: ${unavailable.map((product) => product.name).join(', ')}.`,
        { productIds: unavailable.map((product) => product.id) }
      )
    }

    return byId
  }

  // Os preços vêm do banco, nunca do corpo da requisição (regra 2).
  private buildItems(
    inputItems: ICreateOrderItemInput[],
    products: Map<string, IProduct>
  ): ICreateOrderItemData[] {
    return inputItems.map((item) => {
      const product = products.get(item.productId)

      if (!product) {
        throw new Error(`produto ${item.productId} validado mas ausente do mapa`)
      }

      const { unitPriceCents, totalCents } = calculateLineTotal({
        priceCents: product.priceCents,
        quantity: item.quantity
      })

      return {
        productId: product.id,
        productName: product.name,
        unitPriceCents,
        quantity: item.quantity,
        totalCents,
        notes: item.notes
      }
    })
  }

  private assertPayment(input: ICreateOrderInput, totalCents: number): void {
    if (input.changeForCents === undefined) {
      return
    }

    if (input.paymentMethod !== 'CASH') {
      throw new DomainError(
        `changeForCents enviado com paymentMethod ${input.paymentMethod}.`,
        'Troco só se aplica a pagamento em dinheiro.'
      )
    }

    if (input.changeForCents < totalCents) {
      throw new DomainError(
        `Troco para ${input.changeForCents} menor que o total ${totalCents}.`,
        'O valor para troco é menor que o total do pedido.',
        { totalCents }
      )
    }
  }
}
