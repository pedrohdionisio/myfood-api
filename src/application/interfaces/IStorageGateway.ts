export interface ICreatePresignedUploadParams {
  key: string
  contentType: string
  maxBytes: number
  expiresInSeconds: number
}

export interface IPresignedUpload {
  url: string
  fields: Record<string, string>
}

export interface IPutObjectParams {
  key: string
  body: Buffer
  contentType: string
}

export interface IStorageGateway {
  createPresignedUpload(params: ICreatePresignedUploadParams): Promise<IPresignedUpload>

  getObject(key: string): Promise<Buffer>

  putObject(params: IPutObjectParams): Promise<void>
}
