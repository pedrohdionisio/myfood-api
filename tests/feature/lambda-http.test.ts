import awsLambdaFastify from '@fastify/aws-lambda'
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { orders } from '@/db/schema/index.js'
import { signWebhookPayload } from '@/infra/gateways/abacatepay-webhook.js'
import { setupTestApp } from '../support/app.js'
import { WEBHOOK_SECRET } from '../support/env.js'
import { paidEvent, placePixOrder } from '../support/payments.js'
import { createOrderingScenario, type OrderingScenario } from '../support/scenarios.js'

const t = setupTestApp()

let s: OrderingScenario

beforeEach(async () => {
  s = await createOrderingScenario(t)
})

function httpApiEvent(params: {
  method: string
  path: string
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: string
}): APIGatewayProxyEventV2 {
  const rawQueryString = new URLSearchParams(params.query).toString()

  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: params.path,
    rawQueryString,
    ...(params.query ? { queryStringParameters: params.query } : {}),
    headers: params.headers ?? {},
    requestContext: {
      accountId: '000000000000',
      apiId: 'test',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: params.method,
        path: params.path,
        protocol: 'HTTP/1.1',
        sourceIp: '10.0.0.1',
        userAgent: 'vitest'
      },
      requestId: 'request',
      routeKey: '$default',
      stage: '$default',
      time: '',
      timeEpoch: 0
    },
    // O API Gateway HTTP pode entregar o corpo em base64; é o caso que poderia quebrar o HMAC.
    ...(params.body === undefined ? {} : { body: Buffer.from(params.body).toString('base64') }),
    isBase64Encoded: params.body !== undefined
  }
}

describe('Lambda HTTP adapter', () => {
  it('should answer a plain route through an API Gateway event', async () => {
    const handler = awsLambdaFastify(t.app, { decorateRequest: false })

    const response = await handler(httpApiEvent({ method: 'GET', path: '/health' }), {} as Context)

    expect(response.statusCode).toBe(200)
  })

  it('should verify a payment webhook signature on a base64 body', async () => {
    const handler = awsLambdaFastify(t.app, { decorateRequest: false })
    const { order, charge } = await placePixOrder(t, s)
    const raw = JSON.stringify(paidEvent(charge))

    const response = await handler(
      httpApiEvent({
        method: 'POST',
        path: '/webhooks/abacatepay',
        query: { webhookSecret: WEBHOOK_SECRET },
        headers: {
          'content-type': 'application/json',
          'x-webhook-signature': signWebhookPayload(raw)
        },
        body: raw
      }),
      {} as Context
    )

    expect(response.statusCode, response.body).toBe(200)
    const [row] = await t.db
      .select({ paymentStatus: orders.paymentStatus })
      .from(orders)
      .where(eq(orders.id, order.id))
    expect(row?.paymentStatus).toBe('PAID')
  })
})
