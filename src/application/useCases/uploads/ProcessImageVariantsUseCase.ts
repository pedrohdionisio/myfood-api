import { inject, injectable } from 'tsyringe'
import type { IImageProcessor } from '@/application/interfaces/IImageProcessor.js'
import type { IStorageGateway } from '@/application/interfaces/IStorageGateway.js'
import { TOKENS } from '@/di/tokens.js'
import { IMAGE_VARIANTS, imageKeyFromOriginalObjectKey, variantObjectKey } from '@/domain/images.js'

export interface IProcessImageVariantsResult {
  imageKey: string
  variantKeys: string[]
}

@injectable()
export class ProcessImageVariantsUseCase {
  constructor(
    @inject(TOKENS.StorageGateway) private readonly storage: IStorageGateway,
    @inject(TOKENS.ImageProcessor) private readonly images: IImageProcessor
  ) {}

  /**
   * Devolve null quando o objeto não é um original reconhecível. Reprocessar não adiantaria:
   * a chave nunca vai virar válida, e a mensagem pode ser descartada em vez de ir para a DLQ.
   */
  async execute(objectKey: string): Promise<IProcessImageVariantsResult | null> {
    const imageKey = imageKeyFromOriginalObjectKey(objectKey)

    if (!imageKey) {
      return null
    }

    const original = await this.storage.getObject(objectKey)

    const variantKeys = await Promise.all(
      IMAGE_VARIANTS.map(async (variant) => {
        const body = await this.images.resizeToWebp({
          input: original,
          width: variant.width,
          quality: variant.quality
        })

        const key = variantObjectKey(imageKey, variant.name)

        await this.storage.putObject({ key, body, contentType: 'image/webp' })

        return key
      })
    )

    return { imageKey, variantKeys }
  }
}
