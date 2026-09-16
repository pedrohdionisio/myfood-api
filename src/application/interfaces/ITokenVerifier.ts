export interface IVerifiedToken {
  sub: string
  email: string
  name: string
}

export interface ITokenVerifier {
  verify(token: string): Promise<IVerifiedToken>
}
