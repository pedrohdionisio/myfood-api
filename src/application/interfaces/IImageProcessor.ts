export interface IResizeToWebpParams {
  input: Buffer
  width: number
  quality: number
}

export interface IImageProcessor {
  resizeToWebp(params: IResizeToWebpParams): Promise<Buffer>
}
