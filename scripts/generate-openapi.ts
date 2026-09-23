import 'reflect-metadata'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '@/config/env.js'
import type { IDatabaseConnection } from '@/db/client.js'
import { buildContainer } from '@/di/container.js'
import { TOKENS } from '@/di/tokens.js'
import { buildApp } from '@/http/app.js'

const OUTPUT_DIR = 'docs/api'
const SCALAR_CDN = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'

// A página embute o spec em vez de buscá-lo: assim ela abre com um duplo clique, sem servidor, e
// publicar é copiar a pasta. `<` escapado porque um `</script>` dentro de uma descrição fecharia
// a tag antes da hora.
function renderPage(spec: unknown): string {
  const embedded = JSON.stringify(spec).replaceAll('<', '\\u003c')

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MyFood API</title>
  </head>
  <body>
    <script id="api-reference" type="application/json">${embedded}</script>
    <script src="${SCALAR_CDN}"></script>
  </body>
</html>
`
}

const container = buildContainer(env)
const app = await buildApp(env, container)

await app.ready()

const spec = app.swagger()

await mkdir(OUTPUT_DIR, { recursive: true })
await writeFile(join(OUTPUT_DIR, 'openapi.json'), `${JSON.stringify(spec, null, 2)}\n`)
await writeFile(join(OUTPUT_DIR, 'index.html'), renderPage(spec))

const operations = Object.values(spec.paths ?? {}).reduce(
  (total, path) => total + Object.keys(path ?? {}).length,
  0
)

process.stdout.write(`${operations} operações escritas em ${OUTPUT_DIR}/\n`)

await app.close()
await container.resolve<IDatabaseConnection>(TOKENS.Database).close()
