import type { IAdapters } from '@/di/container.js'
import { FakeAuthGateway } from './FakeAuthGateway.js'
import { FakeImageProcessor } from './FakeImageProcessor.js'
import { FakePaymentGateway } from './FakePaymentGateway.js'
import { FakePushGateway } from './FakePushGateway.js'
import { FakeStorageGateway } from './FakeStorageGateway.js'
import { FakeTokenVerifier } from './FakeTokenVerifier.js'

export { FAKE_RESET_CODE, FakeAuthGateway } from './FakeAuthGateway.js'
export { FakeImageProcessor } from './FakeImageProcessor.js'
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
    pushGateway: new FakePushGateway()
  } satisfies IAdapters

  return {
    ...fakes,
    reset(): void {
      fakes.customerAuthGateway.reset()
      fakes.restaurantAuthGateway.reset()
      fakes.storageGateway.reset()
      fakes.paymentGateway.reset()
      fakes.pushGateway.reset()
    }
  }
}

export type FakeAdapters = ReturnType<typeof buildFakeAdapters>
