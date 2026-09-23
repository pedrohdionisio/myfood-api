import type { CustomMessageTriggerEvent } from 'aws-lambda'
import { describe, expect, it } from 'vitest'
import { handler } from '@/lambda/cognito-custom-message.js'

function event(triggerSource: string): CustomMessageTriggerEvent {
  return {
    triggerSource,
    request: {
      codeParameter: '{####}',
      linkParameter: '',
      usernameParameter: null,
      userAttributes: {}
    },
    response: { smsMessage: null, emailMessage: null, emailSubject: null }
  } as unknown as CustomMessageTriggerEvent
}

describe('cognito CustomMessage trigger', () => {
  it('should render the recovery e-mail keeping the placeholder Cognito replaces', async () => {
    const result = await handler(event('CustomMessage_ForgotPassword'))

    expect(result.response.emailSubject).toBe('MyFood | Recupere a sua conta')
    expect(result.response.emailMessage).toContain('{####}')
  })

  it('should stay under the Cognito limit for emailMessage', async () => {
    const result = await handler(event('CustomMessage_ForgotPassword'))

    expect(result.response.emailMessage?.length).toBeLessThan(20_000)
  })

  it('should leave the other messages untouched', async () => {
    const result = await handler(event('CustomMessage_AdminCreateUser'))

    expect(result.response.emailMessage).toBeNull()
  })
})
