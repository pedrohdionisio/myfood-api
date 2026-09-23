import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { RouteOptions } from 'fastify'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { errorResponseSchema } from '@/schemas/common.js'
import type { App } from '../app.js'

const API_DESCRIPTION = `
API da MyFood, uma plataforma de delivery. Três repositórios: esta API, o dashboard do restaurante
(\`myfood-dashboard\`) e o app do cliente (\`myfood-app\`).

Este documento é gerado a partir dos schemas Zod que **validam a requisição e serializam a resposta
em runtime** — não é documentação escrita à parte. Um campo que não está no schema não sai na
resposta, então o que está aqui é o que a API faz.

## Autenticação

Dois pools do Cognito, um para clientes e outro para usuários de restaurante (donos e entregadores).
O cliente nunca fala com o Cognito: \`sign-up\`, \`sign-in\` e \`refresh\` são rotas daqui.

Use o **\`session.accessToken\`** em \`Authorization: Bearer <token>\`. O \`idToken\` existe para o app
saber quem é o usuário e **não autoriza chamada** — ele carrega e-mail e nome, que a API não precisa.
Um token do pool de clientes não passa numa rota de restaurante: o par (pool, client) é a separação.

Rotas sob \`/restaurants/:restaurantId/\` exigem, além do token, vínculo ativo na tabela
\`restaurant_members\` — lido do banco a cada requisição, nunca das claims do token.

## Erros

Toda falha responde no mesmo formato:

\`\`\`json
{
  "code": "DOMAIN_ERROR",
  "message": "Sem estoque agora: Calabresa.",
  "details": { "productIds": ["01a0c458-..."] },
  "requestId": "01a0cb9a-1e7e-76c6-a6aa-69db3a241d85"
}
\`\`\`

\`message\` é escrita para ser exibida ao usuário final; a mensagem técnica fica no log, associada ao
mesmo \`requestId\`, que também volta no cabeçalho \`x-request-id\`.

| \`code\` | HTTP | Quando |
|---|---|---|
| \`VALIDATION_ERROR\` | 422 | Corpo, query ou params fora do schema. \`details\` traz os campos |
| \`DOMAIN_ERROR\` | 422 | Regra de negócio: restaurante fechado, produto esgotado, transição de status inválida |
| \`UNAUTHORIZED\` | 401 | Sem token, token de outro pool, expirado, ou sem linha correspondente no banco |
| \`FORBIDDEN\` | 403 | Sem vínculo ativo no restaurante, ou papel insuficiente |
| \`NOT_FOUND\` | 404 | Recurso inexistente — ou existente e fora do seu escopo, que respondem igual de propósito |
| \`CONFLICT\` | 409 | Estado mudou no meio do caminho, ou unicidade violada |
| \`TOO_MANY_REQUESTS\` | 429 | Limite de requisições |
| \`INTERNAL_ERROR\` | 500 | Falha nossa |

## Convenções

- **Dinheiro é sempre inteiro em centavos**, com sufixo \`Cents\`. Nunca float.
- **Ids são UUIDv7**, gerados na aplicação — ordenáveis por criação.
- **Datas são ISO 8601 com fuso**. A agregação por dia usa \`America/Sao_Paulo\`.
- **Paginação** por \`page\` e \`perPage\`, com \`hasMore\` na resposta.
- **Nada é apagado** se um pedido antigo puder referenciar: produtos e categorias são arquivados.
- **Limites**: 100 req/min no geral, 10/min no login e cadastro, 5/min na recuperação de senha.

## Uma garantia que vale citar

\`orders.delivery_code\` é o código de 4 dígitos que o cliente mostra ao entregador na porta. Ele
aparece **apenas** na rota do pedido do próprio cliente: não está nos DTOs de restaurante e de
entregador, não passa pelo stream SSE, não entra no texto do push e é redigido no log. Como o
Fastify serializa só o que o schema declara, a garantia é estrutural — não depende de ninguém
lembrar dela.
`.trim()

const TAGS = [
  { name: 'auth', description: 'Cadastro, login, refresh e recuperação de senha dos dois pools' },
  { name: 'customers', description: 'Perfil e endereços do cliente autenticado' },
  { name: 'restaurant-users', description: 'Perfil do usuário de restaurante autenticado' },
  { name: 'restaurants', description: 'Cadastro do restaurante, ativação e horários' },
  { name: 'members', description: 'Equipe do restaurante: donos e entregadores' },
  { name: 'menu', description: 'Categorias e produtos do cardápio' },
  { name: 'discovery', description: 'Vitrine do app: restaurantes, cardápio público e busca' },
  { name: 'orders', description: 'Checkout e pedidos, do lado do cliente' },
  { name: 'restaurant-orders', description: 'Fila do dashboard, transições de status e o stream' },
  { name: 'deliveries', description: 'Entregas do entregador e confirmação pelo código' },
  { name: 'payments', description: 'Cobrança Pix e webhook do gateway' },
  { name: 'reviews', description: 'Avaliação do pedido entregue e resposta do dono' },
  { name: 'analytics', description: 'Agregados diários do restaurante' },
  { name: 'push-tokens', description: 'Registro do aparelho para notificação push' },
  { name: 'uploads', description: 'URLs assinadas para envio de imagem' },
  { name: 'health', description: 'Liveness e readiness' }
]

const AUTH_PRE_HANDLERS: Record<string, string> = {
  authenticateCustomer: 'customerToken',
  authenticateRestaurantUser: 'restaurantToken'
}

const MEMBERSHIP_PRE_HANDLER = 'requireMembershipPreHandler'

// O $schema só faz sentido num documento solto; dentro da resposta o OpenAPI já define o dialeto.
const { $schema, ...ERROR_SCHEMA } = z.toJSONSchema(errorResponseSchema)

function preHandlerNames(route: RouteOptions): string[] {
  const { preHandler } = route

  if (!preHandler) {
    return []
  }

  return (Array.isArray(preHandler) ? preHandler : [preHandler]).map((handler) => handler.name)
}

/**
 * Erros que valem para a operação inteira, deduzidos do que a rota já declara: schema de entrada,
 * preHandlers e config de rate limit. Sai do `transform`, que só monta o documento — nenhum destes
 * schemas entra no serializador, então documentar não muda o que a API responde.
 *
 * 404 e 409 ficam de fora de propósito: dependem do caso e são descritos rota a rota.
 */
function commonErrorResponses(route: RouteOptions): Record<string, unknown> {
  const responses: Record<string, unknown> = {}
  const names = preHandlerNames(route)
  const describe = (description: string) => ({ ...ERROR_SCHEMA, description })

  if (route.schema?.body || route.schema?.params || route.schema?.querystring) {
    responses['422'] = describe(
      'Campos inválidos (VALIDATION_ERROR) ou regra de negócio recusada (DOMAIN_ERROR).'
    )
  }

  if (names.some((name) => name in AUTH_PRE_HANDLERS)) {
    responses['401'] = describe('Token ausente, de outro pool, expirado, ou sem usuário no banco.')
  }

  if (names.includes(MEMBERSHIP_PRE_HANDLER)) {
    responses['403'] = describe('Sem vínculo ativo neste restaurante, ou papel insuficiente.')
  }

  if (route.config?.rateLimit !== false) {
    responses['429'] = describe('Limite de requisições excedido.')
  }

  responses['500'] = describe('Falha inesperada. O requestId da resposta acha a linha no log.')

  return responses
}

function securityFor(route: RouteOptions): Array<Record<string, string[]>> | undefined {
  const scheme = preHandlerNames(route)
    .map((name) => AUTH_PRE_HANDLERS[name])
    .find((value) => value !== undefined)

  return scheme ? [{ [scheme]: [] }] : undefined
}

const transform: typeof jsonSchemaTransform = (input) => {
  const result = jsonSchemaTransform(input)
  const security = securityFor(input.route)
  // O FastifySchema tipa response como unknown; aqui ele já passou pelo jsonSchemaTransform e é o
  // mapa de status para JSON Schema.
  const declared = (result.schema.response ?? {}) as Record<string, unknown>

  return {
    ...result,
    schema: {
      ...result.schema,
      // O que a rota declarou vence: estes são o piso, não a palavra final.
      response: { ...commonErrorResponses(input.route), ...declared },
      ...(security ? { security } : {})
    }
  }
}

export async function registerSwagger(app: App): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MyFood API',
        description: API_DESCRIPTION,
        version: '0.1.0',
        contact: { name: 'Pedro Henrique Dionisio', url: 'https://github.com/pedrohdionisio' }
      },
      servers: [{ url: 'http://localhost:3333', description: 'Desenvolvimento local' }],
      tags: TAGS,
      components: {
        securitySchemes: {
          customerToken: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description:
              'accessToken do pool de clientes, devolvido por POST /auth/customers/sign-in.'
          },
          restaurantToken: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description:
              'accessToken do pool de usuários de restaurante, devolvido por POST /auth/restaurant-users/sign-in.'
          }
        }
      }
    },
    transform
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  })
}
