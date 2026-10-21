import {
  ConflictException,
  CreateScheduleCommand,
  SchedulerClient
} from '@aws-sdk/client-scheduler'
import { pino } from 'pino'
import type { IChargeExpiryScheduler } from '@/application/interfaces/IChargeExpiryScheduler.js'

// A varredura só pega cobrança com expires_at no passado: disparar no segundo exato do vencimento
// poderia encontrá-la ainda válida e não fazer nada.
const MARGIN_MS = 60_000

const logger = pino().child({ gateway: 'charge-expiry-scheduler' })

// O Scheduler quer "at(aaaa-mm-ddThh:mm:ss)", sem milissegundos nem fuso; o fuso vai à parte.
function atExpression(date: Date): string {
  return `at(${date.toISOString().slice(0, 19)})`
}

export class EventBridgeChargeExpiryScheduler implements IChargeExpiryScheduler {
  private readonly client: SchedulerClient

  constructor(
    private readonly targetFunctionArn: string,
    private readonly roleArn: string,
    region: string
  ) {
    this.client = new SchedulerClient({ region })
  }

  async scheduleExpiry(chargeId: string, expiresAt: string): Promise<void> {
    const name = `charge-expiry-${chargeId}`

    try {
      await this.client.send(
        new CreateScheduleCommand({
          Name: name,
          ScheduleExpression: atExpression(new Date(new Date(expiresAt).getTime() + MARGIN_MS)),
          ScheduleExpressionTimezone: 'UTC',
          FlexibleTimeWindow: { Mode: 'OFF' },
          ActionAfterCompletion: 'DELETE',
          Target: { Arn: this.targetFunctionArn, RoleArn: this.roleArn }
        })
      )
    } catch (error) {
      if (error instanceof ConflictException) {
        return
      }

      logger.error({ err: error, chargeId }, 'charge expiry schedule failed')
    }
  }
}
