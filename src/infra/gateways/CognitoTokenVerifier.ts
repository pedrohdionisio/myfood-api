import { CognitoJwtVerifier } from 'aws-jwt-verify'
import type { ITokenVerifier, IVerifiedToken } from '@/application/interfaces/ITokenVerifier.js'

/**
 * Verifica o ID token, e não o access token: o access token do Cognito não carrega e-mail
 * nem nome, e é deles que a linha local é criada no primeiro login. Assim esses dados vêm
 * assinados pelo Cognito em vez de virem no body, onde o cliente poderia mentir.
 */
export class CognitoTokenVerifier implements ITokenVerifier {
  private readonly verifier: ReturnType<
    typeof CognitoJwtVerifier.create<{
      userPoolId: string
      clientId: string
      tokenUse: 'id'
    }>
  >

  constructor(userPoolId: string, clientId: string) {
    this.verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' })
  }

  async verify(token: string): Promise<IVerifiedToken> {
    const payload = await this.verifier.verify(token)

    const email = typeof payload.email === 'string' ? payload.email : null
    const name = typeof payload.name === 'string' ? payload.name : null

    if (!email || !name) {
      throw new Error(`token sem email ou name para sub ${payload.sub}`)
    }

    return { sub: payload.sub, email, name }
  }
}
