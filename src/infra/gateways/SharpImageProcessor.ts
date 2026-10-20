import type {
  IImageProcessor,
  IResizeToWebpParams
} from '@/application/interfaces/IImageProcessor.js'

// Import sob demanda: o JS do sharp vai no bundle, mas o binário nativo só existe na layer da
// Lambda de imagem, e o sharp o carrega assim que o módulo é avaliado. A API registra este adapter
// no container sem nunca chamá-lo; um import estático derrubaria a Lambda HTTP no carregamento.
let sharpModule: Promise<typeof import('sharp')> | undefined

export class SharpImageProcessor implements IImageProcessor {
  async resizeToWebp(params: IResizeToWebpParams): Promise<Buffer> {
    const { input, width, quality } = params

    sharpModule ??= import('sharp')
    const { default: sharp } = await sharpModule

    return sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
  }
}
