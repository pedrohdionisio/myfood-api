import { z } from 'zod'

const editableFields = {
  label: z.string().trim().min(1).max(40),
  zipCode: z.string().regex(/^\d{8}$/, 'Informe o CEP com 8 dígitos, sem máscara.'),
  street: z.string().trim().min(2).max(160),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(80),
  neighborhood: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  state: z.string().regex(/^[A-Z]{2}$/, 'Informe a UF com 2 letras maiúsculas.'),
  reference: z.string().trim().max(160)
}

export const customerAddressParamsSchema = z.object({
  addressId: z.uuid()
})

export const createCustomerAddressBodySchema = z.object({
  ...editableFields,
  label: editableFields.label.optional(),
  complement: editableFields.complement.optional(),
  reference: editableFields.reference.optional(),
  isDefault: z.boolean().optional()
})

export const updateCustomerAddressBodySchema = z
  .object({
    ...editableFields,
    label: editableFields.label.nullable(),
    complement: editableFields.complement.nullable(),
    reference: editableFields.reference.nullable()
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Envie ao menos um campo para atualizar.')

export const customerAddressResponseSchema = z.object({
  id: z.uuid(),
  label: z.string().nullable(),
  zipCode: z.string(),
  street: z.string(),
  number: z.string(),
  complement: z.string().nullable(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  reference: z.string().nullable(),
  isDefault: z.boolean()
})

export const customerAddressesResponseSchema = z.array(customerAddressResponseSchema)
