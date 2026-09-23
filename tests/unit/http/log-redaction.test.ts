import { pino } from 'pino'
import { describe, expect, it } from 'vitest'
import { REDACTED_PATHS } from '@/http/app.js'

function capture() {
  const lines: string[] = []
  const logger = pino(
    { redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' } },
    { write: (line: string) => lines.push(line) }
  )
  return { logger, output: () => lines.join('\n') }
}

describe('log redaction (rule 1)', () => {
  it.each([
    ['at the root', { deliveryCode: '4821' }],
    ['inside the order', { order: { deliveryCode: '4821' } }],
    ['two levels deep', { response: { order: { deliveryCode: '4821' } } }],
    ['as a column name', { row: { delivery_code: '4821' } }]
  ])('should hide the delivery code %s', (_, payload) => {
    const { logger, output } = capture()

    logger.info(payload, 'pedido')

    expect(output()).not.toContain('4821')
    expect(output()).toContain('[REDACTED]')
  })

  it('should hide the authorization header', () => {
    const { logger, output } = capture()

    logger.info({ req: { headers: { authorization: 'Bearer secret-token' } } })

    expect(output()).not.toContain('secret-token')
  })
})
