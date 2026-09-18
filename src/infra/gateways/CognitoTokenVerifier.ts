import { CognitoJwtVerifier } from 'aws-jwt-verify'
import type { ITokenVerifier, IVerifiedToken } from '@/application/interfaces/ITokenVerifier.js'

/**
 * Verifica o ACCESS token. O ID token existe para o app saber quem é o usuário, não para
 * autorizar chamada de API: ele carrega e-mail e nome, que a API não precisa — o sign-up é uma
 * saga e a linha local já existe — e que só aumentam o estrago de um header vazado.
 * Com `tokenUse: 'access'` a biblioteca valida `client_id` no lugar de `aud`, então a separação
 * entre os dois pools continua sendo feita pelo par (userPoolId, clientId).
 */
export class CognitoTokenVerifier implements ITokenVerifier {
  private readonly verifier: ReturnType<
    typeof CognitoJwtVerifier.create<{
      userPoolId: string
      clientId: string
      tokenUse: 'access'
    }>
  >

  constructor(userPoolId: string, clientId: string) {
    this.verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'access' })
  }

  async verify(token: string): Promise<IVerifiedToken> {
    const payload = await this.verifier.verify(token)

    return { sub: payload.sub }
  }
}
