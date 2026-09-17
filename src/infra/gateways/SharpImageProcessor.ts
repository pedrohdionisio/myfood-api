import sharp from 'sharp'
import type {
  IImageProcessor,
  IResizeToWebpParams
} from '@/application/interfaces/IImageProcessor.js'

export class SharpImageProcessor implements IImageProcessor {
  async resizeToWebp(params: IResizeToWebpParams): Promise<Buffer> {
    const { input, width, quality } = params

    return sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
  }
}
