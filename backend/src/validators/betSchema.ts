import { z } from 'zod'

export const createBetSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .refine((d) => new Date(d) <= new Date(), { message: 'Data não pode ser futura' }),
  description: z.string().min(1, 'Descrição é obrigatória').max(500),
  sportId: z.number().int().positive().optional(),
  bookmakerId: z.number().int().positive({ message: 'Casa de apostas é obrigatória' }),
  betType: z.enum(['simple', 'combined']),
  amountWagered: z.number().positive({ message: 'Valor apostado deve ser maior que zero' }),
  odds: z.number().min(1.0, 'Odd deve ser >= 1.0').optional().nullable(),
  payout: z.number().min(0),
  result: z.enum(['won', 'lost', 'void', 'pending']),
  notes: z.string().max(1000).optional().nullable(),
  combinedId: z.number().int().positive().optional().nullable(),
})

export const updateBetSchema = createBetSchema.partial()

export const resultUpdateSchema = z.object({
  result: z.enum(['won', 'lost', 'void', 'pending']),
  payout: z.number().min(0),
})

export const batchBetSchema = z.object({
  bets: z.array(createBetSchema).min(1, 'Pelo menos uma aposta é necessária'),
})

export const betFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(25),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  result: z.enum(['won', 'lost', 'void', 'pending']).optional(),
  sportId: z.coerce.number().int().positive().optional(),
  bookmakerId: z.coerce.number().int().positive().optional(),
  betType: z.enum(['simple', 'combined']).optional(),
  search: z.string().optional(),
  orderBy: z.string().default('date'),
  orderDir: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateBetInput = z.infer<typeof createBetSchema>
export type UpdateBetInput = z.infer<typeof updateBetSchema>
export type ResultUpdateInput = z.infer<typeof resultUpdateSchema>
export type BetFiltersInput = z.infer<typeof betFiltersSchema>
