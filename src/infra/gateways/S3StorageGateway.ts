import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import type {
  ICreatePresignedUploadParams,
  IPresignedUpload,
  IPutObjectParams,
  IStorageGateway
} from '@/application/interfaces/IStorageGateway.js'

export interface IS3Credentials {
  accessKeyId: string
  secretAccessKey: string
}

export class S3StorageGateway implements IStorageGateway {
  private readonly client: S3Client

  constructor(
    private readonly bucket: string,
    region: string,
    credentials?: IS3Credentials
  ) {
    this.client = new S3Client({ region, ...(credentials ? { credentials } : {}) })
  }

  async createPresignedUpload(params: ICreatePresignedUploadParams): Promise<IPresignedUpload> {
    const { key, contentType, maxBytes, expiresInSeconds } = params

    // O tamanho e o tipo entram como condições da policy, então quem recusa o arquivo é o
    // próprio S3. Validar no corpo da requisição só protegeria contra um cliente honesto.
    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresInSeconds,
      Fields: { 'Content-Type': contentType },
      Conditions: [
        ['content-length-range', 1, maxBytes],
        ['eq', '$Content-Type', contentType]
      ]
    })

    return { url, fields }
  }

  async getObject(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))

    if (!result.Body) {
      throw new Error(`objeto ${key} veio sem corpo`)
    }

    return Buffer.from(await result.Body.transformToByteArray())
  }

  async putObject(params: IPutObjectParams): Promise<void> {
    const { key, body, contentType } = params

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable'
      })
    )
  }
}
