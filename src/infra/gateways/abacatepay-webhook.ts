import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Não é segredo nosso: a AbacatePay publica esta chave na documentação e assina com ela os
 * payloads que envia. Serve para provar a origem do evento, não para autenticar a nossa loja.
 */
const ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

function matches(expected: string, received: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(received)

  return a.length === b.length && timingSafeEqual(a, b)
}

export function isValidWebhookSecret(expected: string, received: string | undefined): boolean {
  return received !== undefined && matches(expected, received)
}

export function isValidWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (signature === undefined) {
    return false
  }

  const expected = createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('base64')

  return matches(expected, signature)
}
