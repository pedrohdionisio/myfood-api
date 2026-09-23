import type { Env } from '@/config/env.js'

export const WEBHOOK_SECRET = 'test-webhook-secret-0123456789'

export function buildTestEnv(databaseUrl: string): Env {
  return {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: 0,
    LOG_LEVEL: 'fatal',
    DATABASE_URL: databaseUrl,
    AWS_REGION: 'us-east-1',
    COGNITO_CUSTOMER_POOL_ID: 'us-east-1_customer',
    COGNITO_CUSTOMER_CLIENT_ID: 'customer-client',
    COGNITO_RESTAURANT_POOL_ID: 'us-east-1_restaurant',
    COGNITO_RESTAURANT_CLIENT_ID: 'restaurant-client',
    S3_BUCKET: 'myfood-test',
    SQS_IMAGE_PROCESSING_URL: 'https://sqs.us-east-1.amazonaws.com/000000000000/images',
    SQS_ORDER_EVENTS_URL: 'https://sqs.us-east-1.amazonaws.com/000000000000/order-events',
    MEDIA_BASE_URL: 'https://media.test',
    ABACATEPAY_API_URL: 'https://abacatepay.test',
    ABACATEPAY_API_KEY: 'test-key',
    ABACATEPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    PAYMENT_PIX_EXPIRES_IN_SECONDS: 1800
  }
}
