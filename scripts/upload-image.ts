import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import type { ImageKind } from '@/domain/images.js'

// ─── Preencha aqui ───────────────────────────────────────────────────────────
const EMAIL = 'seuze@example.com'
const PASSWORD = 'Senha@12345'
const RESTAURANT_ID = '01a0abe1-cef1-7474-a242-c02b91d4266a'

// PRODUCT_IMAGE só demonstra o pipeline: produtos ainda não têm rota (Fase 4), então a
// chave é impressa e não vai para o banco. Com logo ou banner o script grava no restaurante.
const KIND: ImageKind = 'RESTAURANT_BANNER'

const API_URL = 'http://localhost:3333'
// ─────────────────────────────────────────────────────────────────────────────

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const SAMPLE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'banner-example.jpg')
const VARIANTS = ['sm', 'md', 'lg'] as const
const POLL_ATTEMPTS = 20
const POLL_INTERVAL_MS = 1000

const KEY_FIELDS: Partial<Record<ImageKind, 'logoKey' | 'bannerKey'>> = {
  RESTAURANT_LOGO: 'logoKey',
  RESTAURANT_BANNER: 'bannerKey'
}

if (!EMAIL || !PASSWORD || !RESTAURANT_ID) {
  process.stderr.write(
    'Preencha EMAIL, PASSWORD e RESTAURANT_ID no topo de scripts/upload-image.ts\n'
  )
  process.exit(1)
}

async function callApi<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers }
  })

  if (!response.ok) {
    throw new Error(`${init.method} ${path} respondeu ${response.status}: ${await response.text()}`)
  }

  return response.json() as Promise<T>
}

async function readSample(): Promise<Buffer> {
  if (!existsSync(SAMPLE_PATH)) {
    process.stdout.write('imagem não existe, gerando uma imagem de teste...\n')

    await writeFile(
      SAMPLE_PATH,
      await sharp({
        create: { width: 1600, height: 1200, channels: 3, background: '#e85d2f' }
      })
        .jpeg({ quality: 90 })
        .toBuffer()
    )
  }

  return readFile(SAMPLE_PATH)
}

// A API verifica o ID token: é o que carrega e-mail e nome.
const { session } = await callApi<{ session: { idToken: string } }>(
  '/auth/restaurant-users/sign-in',
  { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }
)

const authorization = `Bearer ${session.idToken}`

const presigned = await callApi<{
  imageKey: string
  url: string
  fields: Record<string, string>
}>(`/restaurants/${RESTAURANT_ID}/uploads/images`, {
  method: 'POST',
  headers: { authorization },
  body: JSON.stringify({ kind: KIND, contentType: 'image/jpeg' })
})

process.stdout.write(`chave: ${presigned.imageKey}\n`)

const file = await readSample()
const form = new FormData()

for (const [name, value] of Object.entries(presigned.fields)) {
  form.append(name, value)
}

// O arquivo tem que ser o último campo do multipart: o S3 ignora tudo que vier depois dele.
form.append('file', new Blob([new Uint8Array(file)], { type: 'image/jpeg' }), 'logo-example.jpg')

const upload = await fetch(presigned.url, { method: 'POST', body: form })

if (!upload.ok) {
  process.stderr.write(`upload recusado pelo S3 (${upload.status}):\n${await upload.text()}\n`)
  process.exit(1)
}

process.stdout.write(`original enviado (${file.length} bytes), aguardando o worker...\n`)

const keyField = KEY_FIELDS[KIND]

if (keyField) {
  await callApi(`/restaurants/${RESTAURANT_ID}`, {
    method: 'PATCH',
    headers: { authorization },
    body: JSON.stringify({ [keyField]: presigned.imageKey })
  })

  process.stdout.write(`${keyField} gravado no restaurante\n`)
}

const mediaBaseUrl =
  process.env.MEDIA_BASE_URL ??
  `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`

const urls = VARIANTS.map(
  (variant) => `${mediaBaseUrl}/media/${presigned.imageKey}/${variant}.webp`
)

for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
  const responses = await Promise.all(urls.map((url) => fetch(url, { method: 'HEAD' })))

  if (responses.every((response) => response.ok)) {
    process.stdout.write('\nvariantes prontas:\n')

    responses.forEach((response, index) => {
      process.stdout.write(`  ${urls[index]} (${response.headers.get('content-length')} bytes)\n`)
    })

    process.exit(0)
  }

  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
}

process.stderr.write(
  `\nas variantes não apareceram em ${POLL_ATTEMPTS}s. O worker está rodando? (pnpm worker:images)\n`
)
process.exit(1)
