import { orders } from '@/db/schema/index.js'

// Colunas do IOrderNotificationTarget, usadas pelos RETURNING das transições. deliveryCode não
// está aqui e não pode entrar: é o SELECT que mantém o campo fora do DTO (regra 1).
export const ORDER_NOTIFICATION_COLUMNS = {
  id: orders.id,
  restaurantId: orders.restaurantId,
  customerId: orders.customerId,
  displayNumber: orders.displayNumber,
  status: orders.status
}
