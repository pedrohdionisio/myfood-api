import { inject, injectable } from 'tsyringe'
import type { IStorageGateway } from '@/application/interfaces/IStorageGateway.js'
import { TOKENS } from '@/di/tokens.js'
import {
  buildImageKey,
  type ImageContentType,
  type ImageKind,
  MAX_IMAGE_BYTES,
  originalObjectKey
} from '@/domain/images.js'
import { uuidv7 } from '@/shared/uuid.js'

const EXPIRES_IN_SECONDS = 300

export interface ICreateImageUploadInput {
  restaurantId: string
  kind: ImageKind
  contentType: ImageContentType
}

export interface ICreateImageUploadOutput {
  imageKey: string
  url: string
  fields: Record<string, string>
  maxBytes: number
  expiresInSeconds: number
}

@injectable()
export class CreateImageUploadUseCase {
  constructor(@inject(TOKENS.StorageGateway) private readonly storage: IStorageGateway) {}

  async execute(input: ICreateImageUploadInput): Promise<ICreateImageUploadOutput> {
    const { restaurantId, kind, contentType } = input

    const imageKey = buildImageKey(restaurantId, kind, uuidv7())

    const { url, fields } = await this.storage.createPresignedUpload({
      key: originalObjectKey(imageKey),
      contentType,
      maxBytes: MAX_IMAGE_BYTES,
      expiresInSeconds: EXPIRES_IN_SECONDS
    })

    return {
      imageKey,
      url,
      fields,
      maxBytes: MAX_IMAGE_BYTES,
      expiresInSeconds: EXPIRES_IN_SECONDS
    }
  }
}
