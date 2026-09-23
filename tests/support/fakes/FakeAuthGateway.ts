import type {
  IAuthGateway,
  IAuthSession,
  ICreateAuthUserParams,
  ICreatedAuthUser,
  IRefreshedAuthSession,
  IResetPasswordParams,
  ISignInParams
} from '@/application/interfaces/IAuthGateway.js'
import { ConflictError, DomainError, UnauthorizedError } from '@/domain/errors.js'
import { uuidv7 } from '@/shared/uuid.js'
import { type Pool, tokenFor } from './FakeTokenVerifier.js'

export const FAKE_RESET_CODE = '123456'

interface IFakeUser {
  sub: string
  password: string
}

export class FakeAuthGateway implements IAuthGateway {
  readonly users = new Map<string, IFakeUser>()
  readonly deletedEmails: string[] = []
  readonly forgotPasswordRequests: string[] = []

  constructor(private readonly pool: Pool) {}

  reset(): void {
    this.users.clear()
    this.deletedEmails.length = 0
    this.forgotPasswordRequests.length = 0
  }

  async createUser({ email, password }: ICreateAuthUserParams): Promise<ICreatedAuthUser> {
    if (this.users.has(email)) {
      throw new ConflictError(`E-mail ${email} já existe no pool.`, 'Este e-mail já está em uso.')
    }

    const sub = uuidv7()
    this.users.set(email, { sub, password })

    return { cognitoSub: sub }
  }

  async deleteUser(email: string): Promise<void> {
    this.users.delete(email)
    this.deletedEmails.push(email)
  }

  async signIn({ email, password }: ISignInParams): Promise<IAuthSession> {
    const user = this.users.get(email)

    if (user?.password !== password) {
      throw new UnauthorizedError(`Login recusado para ${email}.`, 'E-mail ou senha incorretos.')
    }

    return {
      accessToken: tokenFor(this.pool, user.sub),
      idToken: tokenFor(this.pool, user.sub),
      refreshToken: `refresh.${user.sub}`,
      expiresIn: 3600
    }
  }

  async refreshSession(refreshToken: string): Promise<IRefreshedAuthSession> {
    const sub = refreshToken.replace(/^refresh\./, '')

    if (![...this.users.values()].some((user) => user.sub === sub)) {
      throw new UnauthorizedError('Refresh token inválido ou expirado.')
    }

    return {
      accessToken: tokenFor(this.pool, sub),
      idToken: tokenFor(this.pool, sub),
      expiresIn: 3600
    }
  }

  async forgotPassword(email: string): Promise<void> {
    this.forgotPasswordRequests.push(email)
  }

  async resetPassword({ email, code, password }: IResetPasswordParams): Promise<void> {
    const user = this.users.get(email)

    if (!user || code !== FAKE_RESET_CODE) {
      throw new DomainError('Código de recuperação inválido.')
    }

    user.password = password
  }
}
