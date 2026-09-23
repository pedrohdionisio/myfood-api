import type {
  IImageProcessor,
  IResizeToWebpParams
} from '@/application/interfaces/IImageProcessor.js'

export class FakeImageProcessor implements IImageProcessor {
  async resizeToWebp({ input }: IResizeToWebpParams): Promise<Buffer> {
    return input
  }
}
