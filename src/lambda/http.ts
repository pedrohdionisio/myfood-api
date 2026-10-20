import 'reflect-metadata'
import awsLambdaFastify from '@fastify/aws-lambda'
import { env } from '@/config/env.js'
import { buildContainer } from '@/di/container.js'
import { buildApp } from '@/http/app.js'

// Montado no carregamento do módulo: só o cold start paga o container, os plugins e a conexão.
const app = await buildApp(env, buildContainer(env))

// O app só lê a request HTTP, nunca o evento da Lambda. Sem o decorator, o adaptador também
// funciona sobre um app já pronto, que é como tests/feature/lambda-http.test.ts o exercita.
export const handler = awsLambdaFastify(app, { decorateRequest: false })

await app.ready()
