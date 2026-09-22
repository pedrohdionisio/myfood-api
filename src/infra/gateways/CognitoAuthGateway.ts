import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CodeMismatchException,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ExpiredCodeException,
  ForgotPasswordCommand,
  InvalidPasswordException,
  LimitExceededException,
  NotAuthorizedException,
  TooManyFailedAttemptsException,
  TooManyRequestsException,
  UserNotFoundException,
  UsernameExistsException
} from '@aws-sdk/client-cognito-identity-provider'
import type {
  IAuthGateway,
  IAuthSession,
  ICreateAuthUserParams,
  ICreatedAuthUser,
  IRefreshedAuthSession,
  IResetPasswordParams,
  ISignInParams
} from '@/application/interfaces/IAuthGateway.js'
import {
  ConflictError,
  DomainError,
  TooManyRequestsError,
  UnauthorizedError
} from '@/domain/errors.js'

export interface ICognitoCredentials {
  accessKeyId: string
  secretAccessKey: string
}

export class CognitoAuthGateway implements IAuthGateway {
  private readonly client: CognitoIdentityProviderClient

  constructor(
    private readonly userPoolId: string,
    private readonly clientId: string,
    region: string,
    credentials?: ICognitoCredentials
  ) {
    this.client = new CognitoIdentityProviderClient({
      region,
      ...(credentials ? { credentials } : {})
    })
  }

  async createUser(params: ICreateAuthUserParams): Promise<ICreatedAuthUser> {
    const { email, name, password } = params

    let cognitoSub: string | undefined

    try {
      // SUPPRESS porque quem escolhe a senha é o próprio usuário, no corpo da requisição:
      // o e-mail de convite do Cognito mandaria uma senha temporária que ninguém vai usar.
      const created = await this.client.send(
        new AdminCreateUserCommand({
          UserPoolId: this.userPoolId,
          Username: email,
          MessageAction: 'SUPPRESS',
          TemporaryPassword: password,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: name }
          ]
        })
      )

      cognitoSub = created.User?.Attributes?.find((a) => a.Name === 'sub')?.Value
    } catch (error) {
      if (error instanceof UsernameExistsException) {
        throw new ConflictError(
          `E-mail ${email} já existe no pool ${this.userPoolId}.`,
          'Este e-mail já está cadastrado.'
        )
      }

      throw error
    }

    if (!cognitoSub) {
      await this.deleteUser(email)

      throw new Error(`AdminCreateUser não retornou sub para ${email}`)
    }

    // AdminCreateUser deixa a conta em FORCE_CHANGE_PASSWORD, e o login responderia
    // NEW_PASSWORD_REQUIRED — desafio que nenhuma rota sabe tratar.
    try {
      await this.client.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: this.userPoolId,
          Username: email,
          Password: password,
          Permanent: true
        })
      )
    } catch (error) {
      await this.deleteUser(email)

      throw error
    }

    return { cognitoSub }
  }

  async deleteUser(email: string): Promise<void> {
    try {
      await this.client.send(
        new AdminDeleteUserCommand({ UserPoolId: this.userPoolId, Username: email })
      )
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return
      }

      throw error
    }
  }

  async signIn(params: ISignInParams): Promise<IAuthSession> {
    const { email, password } = params

    try {
      const result = await this.client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.userPoolId,
          ClientId: this.clientId,
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
          AuthParameters: { USERNAME: email, PASSWORD: password }
        })
      )

      const session = result.AuthenticationResult

      if (!session?.AccessToken || !session.IdToken || !session.RefreshToken) {
        throw new Error(`login sem tokens completos para ${email}`)
      }

      return {
        accessToken: session.AccessToken,
        idToken: session.IdToken,
        refreshToken: session.RefreshToken,
        expiresIn: session.ExpiresIn ?? 3600
      }
    } catch (error) {
      // Senha errada e usuário inexistente respondem igual, para não revelar quais
      // e-mails têm conta.
      if (error instanceof NotAuthorizedException || error instanceof UserNotFoundException) {
        throw new UnauthorizedError(`Login recusado para ${email}.`, 'E-mail ou senha incorretos.')
      }

      throw error
    }
  }

  async refreshSession(refreshToken: string): Promise<IRefreshedAuthSession> {
    try {
      const result = await this.client.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.userPoolId,
          ClientId: this.clientId,
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: { REFRESH_TOKEN: refreshToken }
        })
      )

      const session = result.AuthenticationResult

      if (!session?.AccessToken || !session.IdToken) {
        throw new Error('refresh sem tokens completos')
      }

      return {
        accessToken: session.AccessToken,
        idToken: session.IdToken,
        expiresIn: session.ExpiresIn ?? 3600
      }
    } catch (error) {
      if (error instanceof NotAuthorizedException) {
        throw new UnauthorizedError('Refresh token inválido ou expirado.')
      }

      throw error
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await this.client.send(
        new ForgotPasswordCommand({ ClientId: this.clientId, Username: email })
      )
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return
      }

      if (error instanceof LimitExceededException || error instanceof TooManyRequestsException) {
        throw new TooManyRequestsError(
          `Cognito limitou o envio de código para ${email}.`,
          'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
        )
      }

      throw error
    }
  }

  async resetPassword(params: IResetPasswordParams): Promise<void> {
    const { email, code, password } = params

    try {
      await this.client.send(
        new ConfirmForgotPasswordCommand({
          ClientId: this.clientId,
          Username: email,
          ConfirmationCode: code,
          Password: password
        })
      )
    } catch (error) {
      if (error instanceof CodeMismatchException || error instanceof UserNotFoundException) {
        throw new DomainError(
          `Código de recuperação inválido para ${email}.`,
          'Código inválido. Confira o e-mail e tente de novo.'
        )
      }

      if (error instanceof ExpiredCodeException) {
        throw new DomainError(
          `Código de recuperação expirado para ${email}.`,
          'Código expirado. Peça um novo código.'
        )
      }

      if (error instanceof InvalidPasswordException) {
        throw new DomainError(
          `Senha recusada pela política do pool ${this.userPoolId}.`,
          'A senha precisa ter ao menos 8 caracteres, com maiúscula, minúscula e número.'
        )
      }

      if (
        error instanceof TooManyFailedAttemptsException ||
        error instanceof LimitExceededException ||
        error instanceof TooManyRequestsException
      ) {
        throw new TooManyRequestsError(
          `Cognito bloqueou as tentativas de troca de senha de ${email}.`,
          'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
        )
      }

      throw error
    }
  }
}
