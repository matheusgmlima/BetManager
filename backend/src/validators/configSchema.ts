import { z } from 'zod'

export const createBookmakerSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hex válido (ex: #FF5500)')
    .default('#6B7280'),
})

export const updateBookmakerSchema = createBookmakerSchema.partial()

export const createSportSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional().nullable(),
})

export const updateSportSchema = createSportSchema.partial()

export const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
})

export const updateProfileSchema = createProfileSchema.partial()

export type CreateBookmakerInput = z.infer<typeof createBookmakerSchema>
export type CreateSportInput = z.infer<typeof createSportSchema>
export type CreateProfileInput = z.infer<typeof createProfileSchema>
