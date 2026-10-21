import type { IAdapters } from '@/di/container.js'
import { FakeAuthGateway } from './FakeAuthGateway.js'
import { FakeChargeExpiryScheduler } from './FakeChargeExpiryScheduler.js'
import { FakeEventPublisher } from './FakeEventPublisher.js'
import { FakeImageProcessor } from './FakeImageProcessor.js'
import { FakeOrderStream } from './FakeOrderStream.js'
import { FakeOrderStreamTickets } from './FakeOrderStreamTickets.js'
import { FakeOutboxRelayTrigger } from './FakeOutboxRelayTrigger.js'
import { FakePaymentGateway } from './FakePaymentGateway.js'
import { FakePushGateway } from './FakePushGateway.js'
import { FakeStorageGateway } from './FakeStorageGateway.js'
import { FakeTokenVerifier } from './FakeTokenVerifier.js'

export { FAKE_RESET_CODE, FakeAuthGateway } from './FakeAuthGateway.js'
export { FakeChargeExpiryScheduler } from './FakeChargeExpiryScheduler.js'
export { FakeEventPublisher } from './FakeEventPublisher.js'
export { FakeImageProcessor } from './FakeImageProcessor.js'
export { FakeOrderStream } from './FakeOrderStream.js'
export { FakeOrderStreamTickets } from './FakeOrderStreamTickets.js'
export { FakeOutboxRelayTrigger } from './FakeOutboxRelayTrigger.js'
export { FakePaymentGateway } from './FakePaymentGateway.js'
export { FakePushGateway } from './FakePushGateway.js'
export { FakeStorageGateway } from './FakeStorageGateway.js'
export { FakeTokenVerifier, type Pool, tokenFor } from './FakeTokenVerifier.js'

export function buildFakeAdapters() {
  const fakes = {
    customerTokenVerifier: new FakeTokenVerifier('customer'),
    restaurantTokenVerifier: new FakeTokenVerifier('restaurant'),
    customerAuthGateway: new FakeAuthGateway('customer'),
    restaurantAuthGateway: new FakeAuthGateway('restaurant'),
    storageGateway: new FakeStorageGateway(),
    imageProcessor: new FakeImageProcessor(),
    paymentGateway: new FakePaymentGateway(),
    pushGateway: new FakePushGateway(),
    eventPublisher: new FakeEventPublisher(),
    outboxRelayTrigger: new FakeOutboxRelayTrigger(),
    chargeExpiryScheduler: new FakeChargeExpiryScheduler(),
    orderStream: new FakeOrderStream(),
    orderStreamTickets: new FakeOrderStreamTickets()
  } satisfies IAdapters

  return {
    ...fakes,
    reset(): void {
      fakes.customerAuthGateway.reset()
      fakes.restaurantAuthGateway.reset()
      fakes.storageGateway.reset()
      fakes.paymentGateway.reset()
      fakes.pushGateway.reset()
      fakes.eventPublisher.reset()
      fakes.outboxRelayTrigger.reset()
      fakes.chargeExpiryScheduler.reset()
      fakes.orderStream.reset()
      fakes.orderStreamTickets.reset()
    }
  }
}

export type FakeAdapters = ReturnType<typeof buildFakeAdapters>
