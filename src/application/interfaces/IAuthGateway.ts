export interface ICreateAuthUserParams {
  email: string
  name: string
  password: string
}

export interface ICreatedAuthUser {
  cognitoSub: string
}

export interface ISignInParams {
  email: string
  password: string
}

export interface IResetPasswordParams {
  email: string
  code: string
  password: string
}

export interface IAuthSession {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
}

// O refresh não devolve refresh token novo: os dois pools estão sem rotação, então o token
// original continua valendo os 30 dias configurados.
export interface IRefreshedAuthSession {
  accessToken: string
  idToken: string
  expiresIn: number
}

/**
 * Tudo que a API faz no User Pool. O cliente nunca fala com o Cognito: ele chama a API,
 * e a API decide o que acontece na AWS e no banco.
 */
export interface IAuthGateway {
  createUser(params: ICreateAuthUserParams): Promise<ICreatedAuthUser>

  deleteUser(email: string): Promise<void>

  signIn(params: ISignInParams): Promise<IAuthSession>

  refreshSession(refreshToken: string): Promise<IRefreshedAuthSession>

  /** Dispara o e-mail com o código de recuperação. Silencioso para e-mail inexistente. */
  forgotPassword(email: string): Promise<void>

  resetPassword(params: IResetPasswordParams): Promise<void>
}
