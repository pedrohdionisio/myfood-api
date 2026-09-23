import type { ITokenVerifier, IVerifiedToken } from '@/application/interfaces/ITokenVerifier.js'

export type Pool = 'customer' | 'restaurant'

export function tokenFor(pool: Pool, sub: string): string {
  return `${pool}.${sub}`
}

export class FakeTokenVerifier implements ITokenVerifier {
  constructor(private readonly pool: Pool) {}

  async verify(token: string): Promise<IVerifiedToken> {
    const prefix = `${this.pool}.`

    if (!token.startsWith(prefix)) {
      throw new Error(`token de outro pool: ${token}`)
    }

    return { sub: token.slice(prefix.length) }
  }
}
