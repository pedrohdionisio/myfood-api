import { describe, expect, it } from 'vitest'
import {
  isValidWebhookSecret,
  isValidWebhookSignature,
  signWebhookPayload
} from '@/infra/gateways/abacatepay-webhook.js'

describe('isValidWebhookSecret', () => {
  it('should accept only the exact secret', () => {
    expect(isValidWebhookSecret('secret-value', 'secret-value')).toBe(true)
    expect(isValidWebhookSecret('secret-value', 'secret-valuf')).toBe(false)
    expect(isValidWebhookSecret('secret-value', 'secret')).toBe(false)
    expect(isValidWebhookSecret('secret-value', undefined)).toBe(false)
  })
})

describe('isValidWebhookSignature', () => {
  const body = JSON.stringify({ id: 'evt_1', event: 'billing.paid' })

  it('should accept the HMAC of the exact raw body', () => {
    expect(isValidWebhookSignature(body, signWebhookPayload(body))).toBe(true)
  })

  it('should reject a signature for a different body', () => {
    expect(isValidWebhookSignature(`${body} `, signWebhookPayload(body))).toBe(false)
  })

  it('should reject a missing signature', () => {
    expect(isValidWebhookSignature(body, undefined)).toBe(false)
  })
})
