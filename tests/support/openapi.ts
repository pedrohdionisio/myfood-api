import type { App } from '@/http/app.js'

export interface IOperation {
  method: string
  path: string
  security: string[]
  responses: Record<string, unknown>
}

interface IOpenApiDocument {
  paths: Record<
    string,
    Record<string, { security?: Record<string, unknown>[]; responses: Record<string, unknown> }>
  >
}

// O spec sai do mesmo Zod que roda nas rotas, então percorrê-lo é percorrer todas as rotas
// registradas — inclusive as que ainda não existem quando este arquivo foi escrito.
export function listOperations(app: App): IOperation[] {
  const document = app.swagger() as unknown as IOpenApiDocument

  return Object.entries(document.paths).flatMap(([path, operations]) =>
    Object.entries(operations).map(([method, operation]) => ({
      method: method.toUpperCase(),
      path,
      security: (operation.security ?? []).flatMap((entry) => Object.keys(entry)),
      responses: operation.responses
    }))
  )
}

export function operationName({ method, path }: Pick<IOperation, 'method' | 'path'>): string {
  return `${method} ${path}`
}

export function fillPath(path: string, params: Record<string, string>): string {
  return path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name]
    if (!value) throw new Error(`sem valor para o parâmetro ${name} de ${path}`)
    return value
  })
}

export function containsProperty(schema: unknown, property: string): boolean {
  if (Array.isArray(schema)) {
    return schema.some((item) => containsProperty(item, property))
  }

  if (schema !== null && typeof schema === 'object') {
    return Object.entries(schema).some(
      ([key, value]) =>
        (key === 'properties' &&
          value !== null &&
          typeof value === 'object' &&
          property in value) ||
        containsProperty(value, property)
    )
  }

  return false
}
