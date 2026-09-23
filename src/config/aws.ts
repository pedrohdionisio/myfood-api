import type { Env } from './env.js'

export interface IAwsCredentials {
  accessKeyId: string
  secretAccessKey: string
}

// Sem as duas chaves o SDK resolve pela cadeia padrão (~/.aws/credentials, role da AWS).
export function awsCredentials(env: Env): IAwsCredentials | undefined {
  return env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
    : undefined
}
