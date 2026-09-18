export interface IVerifiedToken {
  sub: string
}

export interface ITokenVerifier {
  verify(token: string): Promise<IVerifiedToken>
}
