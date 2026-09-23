import type { IMembershipsRepository } from '@/application/interfaces/IMembershipsRepository.js'
import type { IOrderNotificationTarget } from '@/application/interfaces/IOrdersRepository.js'
import { ForbiddenError } from '@/domain/errors.js'

export async function listDriverMemberIds(
  memberships: IMembershipsRepository,
  userId: string
): Promise<string[]> {
  const active = await memberships.listActiveByUser(userId)

  return active.filter((item) => item.role === 'DRIVER').map((item) => item.id)
}

/**
 * Um entregador pode trabalhar para vários restaurantes, então o vínculo não vem da rota: o
 * pedido é que diz qual vínculo está atribuído, e ele precisa ser um dos vínculos do caller.
 */
export async function requireAssignedDriverMemberId(
  memberships: IMembershipsRepository,
  userId: string,
  assignment: IOrderNotificationTarget
): Promise<string> {
  const memberIds = await listDriverMemberIds(memberships, userId)
  const assigned = assignment.driverMemberId

  if (!assigned || !memberIds.includes(assigned)) {
    throw new ForbiddenError(
      `Usuário ${userId} não é o entregador atribuído (driverMemberId=${assigned}).`,
      'Esta entrega não está atribuída a você.'
    )
  }

  return assigned
}
