import { inject, injectable } from 'tsyringe'
import type { IOrdersRepository } from '@/application/interfaces/IOrdersRepository.js'
import type { IPaymentGateway } from '@/application/interfaces/IPaymentGateway.js'
import type { IPayment, IPaymentsRepository } from '@/application/interfaces/IPaymentsRepository.js'
import { TOKENS } from '@/di/tokens.js'
import { DomainError, NotFoundError } from '@/domain/errors.js'

@injectable()
export class CreatePixPaymentUseCase {
  constructor(
    @inject(TOKENS.PaymentsRepository)
    private readonly paymentsRepository: IPaymentsRepository,
    @inject(TOKENS.OrdersRepository)
    private readonly orders: IOrdersRepository,
    @inject(TOKENS.PaymentGateway)
    private readonly gateway: IPaymentGateway,
    @inject(TOKENS.PixExpiresInSeconds)
    private readonly expiresInSeconds: number
  ) {}

  async execute(customerId: string, orderId: string): Promise<IPayment> {
    const order = await this.orders.findByIdForCustomer(customerId, orderId)

    if (!order) {
      throw new NotFoundError(`Pedido ${orderId} não encontrado para o cliente ${customerId}.`)
    }

    if (order.paymentMethod !== 'ONLINE') {
      throw new DomainError(
        `Pedido ${orderId} é ${order.paymentMethod}, não tem cobrança online.`,
        'Este pedido é para pagar na entrega.'
      )
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new DomainError(
        `Pedido ${orderId} está em ${order.status}, fora da janela de pagamento.`,
        'Este pedido não está mais aguardando pagamento.'
      )
    }

    const open = await this.paymentsRepository.findOpenByOrder(orderId)

    if (open) {
      if (new Date(open.expiresAt) > new Date()) {
        return open
      }

      throw new DomainError(
        `Cobrança ${open.providerChargeId} do pedido ${orderId} venceu em ${open.expiresAt}.`,
        'O prazo deste Pix acabou. Faça o pedido novamente.'
      )
    }

    const charge = await this.gateway.createPixCharge({
      orderId: order.id,
      displayNumber: order.displayNumber,
      amountCents: order.totalCents,
      expiresInSeconds: this.expiresInSeconds
    })

    if (charge.amountCents !== order.totalCents) {
      throw new Error(
        `gateway criou cobrança de ${charge.amountCents} para pedido de ${order.totalCents}`
      )
    }

    return this.paymentsRepository.create({
      orderId: order.id,
      providerChargeId: charge.chargeId,
      amountCents: charge.amountCents,
      brCode: charge.brCode,
      platformFeeCents: charge.platformFeeCents,
      expiresAt: new Date(charge.expiresAt)
    })
  }
}
