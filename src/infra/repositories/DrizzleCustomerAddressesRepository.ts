import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { inject, injectable } from 'tsyringe'
import type {
  ICreateCustomerAddressData,
  ICustomerAddress,
  ICustomerAddressesRepository,
  IUpdateCustomerAddressData
} from '@/application/interfaces/ICustomerAddressesRepository.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { customerAddresses, customers } from '@/db/schema/index.js'
import { TOKENS } from '@/di/tokens.js'
import { NotFoundError } from '@/domain/errors.js'
import { uuidv7 } from '@/shared/uuid.js'

const CUSTOMER_ADDRESS_COLUMNS = {
  id: customerAddresses.id,
  label: customerAddresses.label,
  zipCode: customerAddresses.zipCode,
  street: customerAddresses.street,
  number: customerAddresses.number,
  complement: customerAddresses.complement,
  neighborhood: customerAddresses.neighborhood,
  city: customerAddresses.city,
  state: customerAddresses.state,
  reference: customerAddresses.reference,
  isDefault: customerAddresses.isDefault
}

type Transaction = Parameters<Parameters<IDatabaseConnection['db']['transaction']>[0]>[0]

async function lockCustomer(tx: Transaction, customerId: string): Promise<void> {
  const [row] = await tx
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, customerId))
    .for('update')
    .limit(1)

  if (!row) {
    throw new NotFoundError(`Cliente ${customerId} não encontrado.`)
  }
}

async function clearDefault(tx: Transaction, customerId: string): Promise<void> {
  await tx
    .update(customerAddresses)
    .set({ isDefault: false })
    .where(and(eq(customerAddresses.customerId, customerId), eq(customerAddresses.isDefault, true)))
}

@injectable()
export class DrizzleCustomerAddressesRepository implements ICustomerAddressesRepository {
  constructor(@inject(TOKENS.Database) private readonly database: IDatabaseConnection) {}

  async listByCustomer(customerId: string): Promise<ICustomerAddress[]> {
    return this.database.db
      .select(CUSTOMER_ADDRESS_COLUMNS)
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId))
      .orderBy(desc(customerAddresses.isDefault), asc(customerAddresses.createdAt))
  }

  async create(data: ICreateCustomerAddressData): Promise<ICustomerAddress> {
    const { customerId, isDefault, ...fields } = data

    return this.database.db.transaction(async (tx) => {
      await lockCustomer(tx, customerId)

      const [existing] = await tx
        .select({ id: customerAddresses.id })
        .from(customerAddresses)
        .where(eq(customerAddresses.customerId, customerId))
        .limit(1)

      const becomesDefault = isDefault === true || !existing

      if (becomesDefault) {
        await clearDefault(tx, customerId)
      }

      const [row] = await tx
        .insert(customerAddresses)
        .values({ id: uuidv7(), customerId, ...fields, isDefault: becomesDefault })
        .returning(CUSTOMER_ADDRESS_COLUMNS)

      if (!row) {
        throw new Error('insert de customer_address não retornou linha')
      }

      return row
    })
  }

  async update(
    customerId: string,
    id: string,
    data: IUpdateCustomerAddressData
  ): Promise<ICustomerAddress> {
    const [row] = await this.database.db
      .update(customerAddresses)
      .set(data)
      .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customerId)))
      .returning(CUSTOMER_ADDRESS_COLUMNS)

    if (!row) {
      throw new NotFoundError(`Endereço ${id} não encontrado para o cliente ${customerId}.`)
    }

    return row
  }

  async setDefault(customerId: string, id: string): Promise<ICustomerAddress> {
    return this.database.db.transaction(async (tx) => {
      await lockCustomer(tx, customerId)
      await clearDefault(tx, customerId)

      const [row] = await tx
        .update(customerAddresses)
        .set({ isDefault: true })
        .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customerId)))
        .returning(CUSTOMER_ADDRESS_COLUMNS)

      if (!row) {
        throw new NotFoundError(`Endereço ${id} não encontrado para o cliente ${customerId}.`)
      }

      return row
    })
  }

  async delete(customerId: string, id: string): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      await lockCustomer(tx, customerId)

      const [deleted] = await tx
        .delete(customerAddresses)
        .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customerId)))
        .returning({ isDefault: customerAddresses.isDefault })

      if (!deleted) {
        throw new NotFoundError(`Endereço ${id} não encontrado para o cliente ${customerId}.`)
      }

      if (!deleted.isDefault) {
        return
      }

      await tx
        .update(customerAddresses)
        .set({ isDefault: true })
        .where(
          eq(
            customerAddresses.id,
            sql`(
              select a.id from customer_addresses a
              where a.customer_id = ${customerId}
              order by a.created_at desc, a.id desc
              limit 1
            )`
          )
        )
    })
  }
}
