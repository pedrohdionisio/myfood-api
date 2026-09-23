import {
  CodeMismatchException,
  CognitoIdentityProviderClient,
  NotAuthorizedException,
  UserNotFoundException
} from '@aws-sdk/client-cognito-identity-provider'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CognitoAuthGateway } from '@/infra/gateways/CognitoAuthGateway.js'

const gateway = new CognitoAuthGateway('us-east-1_pool', 'client', 'us-east-1', {
  accessKeyId: 'test',
  secretAccessKey: 'test'
})

function cognitoFails(error: Error) {
  vi.spyOn(CognitoIdentityProviderClient.prototype, 'send').mockRejectedValue(error as never)
}

function cognitoSucceeds() {
  vi.spyOn(CognitoIdentityProviderClient.prototype, 'send').mockResolvedValue({} as never)
}

const metadata = { message: 'cognito', $metadata: {} }

async function outcome(run: () => Promise<unknown>) {
  try {
    await run()
    return { ok: true }
  } catch (error) {
    const { statusCode, userMessage } = error as { statusCode?: number; userMessage?: string }
    return { ok: false, statusCode, userMessage }
  }
}

// A API não pode confirmar se um e-mail tem conta: as respostas para e-mail conhecido e
// desconhecido precisam ser indistinguíveis para quem chama.
describe('CognitoAuthGateway does not reveal whether an account exists', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should answer forgot-password the same for known and unknown e-mails', async () => {
    cognitoSucceeds()
    const known = await outcome(() => gateway.forgotPassword('known@myfood.test'))

    cognitoFails(new UserNotFoundException(metadata))
    const unknown = await outcome(() => gateway.forgotPassword('unknown@myfood.test'))

    expect(unknown).toEqual(known)
    expect(known).toEqual({ ok: true })
  })

  it('should answer reset-password the same for a wrong code and an unknown e-mail', async () => {
    cognitoFails(new CodeMismatchException(metadata))
    const wrongCode = await outcome(() =>
      gateway.resetPassword({ email: 'known@myfood.test', code: '000000', password: 'Senha123' })
    )

    cognitoFails(new UserNotFoundException(metadata))
    const unknown = await outcome(() =>
      gateway.resetPassword({ email: 'unknown@myfood.test', code: '000000', password: 'Senha123' })
    )

    expect(unknown).toEqual(wrongCode)
    expect(wrongCode).toMatchObject({ ok: false, statusCode: 422 })
  })

  it('should answer sign-in the same for a wrong password and an unknown e-mail', async () => {
    cognitoFails(new NotAuthorizedException(metadata))
    const wrongPassword = await outcome(() =>
      gateway.signIn({ email: 'known@myfood.test', password: 'errada' })
    )

    cognitoFails(new UserNotFoundException(metadata))
    const unknown = await outcome(() =>
      gateway.signIn({ email: 'unknown@myfood.test', password: 'errada' })
    )

    expect(unknown).toEqual(wrongPassword)
    expect(wrongPassword).toMatchObject({ ok: false, statusCode: 401 })
  })
})
