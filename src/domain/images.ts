export const IMAGE_KINDS = ['RESTAURANT_LOGO', 'RESTAURANT_BANNER', 'PRODUCT_IMAGE'] as const
export type ImageKind = (typeof IMAGE_KINDS)[number]

export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number]

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const IMAGE_VARIANTS = [
  { name: 'sm', width: 320, quality: 65 },
  { name: 'md', width: 720, quality: 75 },
  { name: 'lg', width: 1280, quality: 80 }
] as const

export type ImageVariant = (typeof IMAGE_VARIANTS)[number]
export type ImageVariantName = ImageVariant['name']

export type ImageUrls = Record<ImageVariantName, string>

const ORIGINALS_PREFIX = 'originals'
const MEDIA_PREFIX = 'media'
const VARIANT_EXTENSION = 'webp'

const KIND_SEGMENTS: Record<ImageKind, string> = {
  RESTAURANT_LOGO: 'logo',
  RESTAURANT_BANNER: 'banner',
  PRODUCT_IMAGE: 'products'
}

const IMAGE_KEY_PATTERN = /^restaurants\/([0-9a-f-]{36})\/(logo|banner|products)\/([0-9a-f-]{36})$/

export function buildImageKey(restaurantId: string, kind: ImageKind, uploadId: string): string {
  return `restaurants/${restaurantId}/${KIND_SEGMENTS[kind]}/${uploadId}`
}

export function originalObjectKey(imageKey: string): string {
  return `${ORIGINALS_PREFIX}/${imageKey}`
}

export function variantObjectKey(imageKey: string, variant: ImageVariantName): string {
  return `${MEDIA_PREFIX}/${imageKey}/${variant}.${VARIANT_EXTENSION}`
}

export function imageKeyFromOriginalObjectKey(objectKey: string): string | null {
  const imageKey = objectKey.startsWith(`${ORIGINALS_PREFIX}/`)
    ? objectKey.slice(ORIGINALS_PREFIX.length + 1)
    : null

  return imageKey && IMAGE_KEY_PATTERN.test(imageKey) ? imageKey : null
}

/**
 * A chave é gravada no banco pelo próprio dono, então precisa ser conferida contra o
 * restaurante da rota: sem isso um dono apontaria o logo para a chave de outro.
 */
export function isImageKeyOwnedBy(
  imageKey: string,
  restaurantId: string,
  kind: ImageKind
): boolean {
  const match = IMAGE_KEY_PATTERN.exec(imageKey)

  return match?.[1] === restaurantId && match[2] === KIND_SEGMENTS[kind]
}

export function buildImageUrls(mediaBaseUrl: string, imageKey: string): ImageUrls {
  const urls = {} as ImageUrls

  for (const variant of IMAGE_VARIANTS) {
    urls[variant.name] = `${mediaBaseUrl}/${variantObjectKey(imageKey, variant.name)}`
  }

  return urls
}
