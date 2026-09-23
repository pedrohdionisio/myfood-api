import { eq } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  IAuthenticatedCustomer,
  ICreateCustomerData,
  ICustomersRepository,
  IUpdateCustomerProfileData
} from '@/application/interfaces/ICustomersRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { customers } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { ConflictError, NotFoundError } from '@/domain/errors.js'
import { violatesUniqueConstraint } from './unique-violation.js'

const DUPLICATE_EMAIL_CONSTRAINT = 'customers_email_unique'

const SELECTION = {
  id: customers.id,
  cognitoSub: customers.cognitoSub,
  name: customers.name,
  email: customers.email,
  phone: customers.phone
}

@injectable()
export class DrizzleCustomersRepository implements ICustomersRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async findByCognitoSub(cognitoSub: string): Promise<IAuthenticatedCustomer | null> {
    const [row] = await this.database.db
      .select(SELECTION)
      .from(customers)
      .where(eq(customers.cognitoSub, cognitoSub))
      .limit(1)

    return row ?? null
  }

  async findByEmail(email: string): Promise<IAuthenticatedCustomer | null> {
    const [row] = await this.database.db
      .select(SELECTION)
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1)

    return row ?? null
  }

  async updateProfile(
    id: string,
    data: IUpdateCustomerProfileData
  ): Promise<IAuthenticatedCustomer> {
    const [row] = await this.database.db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning(SELECTION)

    if (!row) {
      throw new NotFoundError(`Usuário ${id} não encontrado em customers.`)
    }

    return row
  }

  async create(data: ICreateCustomerData): Promise<IAuthenticatedCustomer> {
    try {
      const [row] = await this.database.db.insert(customers).values(data).returning(SELECTION)

      if (!row) {
        throw new Error('insert de customer não retornou linha')
      }

      return row
    } catch (error) {
      if (violatesUniqueConstraint(error, DUPLICATE_EMAIL_CONSTRAINT)) {
        throw new ConflictError(
          `E-mail ${data.email} já existe em customers.`,
          'Este e-mail já está cadastrado.'
        )
      }

      throw error
    }
  }
}
