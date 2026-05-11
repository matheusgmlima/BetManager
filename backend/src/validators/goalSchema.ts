import { z } from 'zod'

export const createGoalSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
  targetProfit: z.number().positive({ message: 'Objetivo deve ser maior que zero' }),
  notes: z.string().max(500).optional().nullable(),
})

export const updateGoalSchema = createGoalSchema.partial()

export type CreateGoalInput = z.infer<typeof createGoalSchema>
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>
