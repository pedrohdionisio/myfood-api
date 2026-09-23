import type {
  ICreatePresignedUploadParams,
  IPresignedUpload,
  IPutObjectParams,
  IStorageGateway
} from '@/application/interfaces/IStorageGateway.js'

export class FakeStorageGateway implements IStorageGateway {
  readonly objects = new Map<string, Buffer>()
  readonly presignedUploads: ICreatePresignedUploadParams[] = []

  reset(): void {
    this.objects.clear()
    this.presignedUploads.length = 0
  }

  async createPresignedUpload(params: ICreatePresignedUploadParams): Promise<IPresignedUpload> {
    this.presignedUploads.push(params)

    return { url: 'https://storage.test', fields: { key: params.key } }
  }

  async getObject(key: string): Promise<Buffer> {
    const object = this.objects.get(key)

    if (!object) {
      throw new Error(`objeto ${key} não existe`)
    }

    return object
  }

  async putObject({ key, body }: IPutObjectParams): Promise<void> {
    this.objects.set(key, body)
  }
}
