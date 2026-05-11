import { BetResult, BetType, BetSource } from '@prisma/client'

export type { BetResult, BetType, BetSource }

export interface BetCreateInput {
  date: string
  description: string
  sportId?: number
  bookmakerId: number
  betType: BetType
  amountWagered: number
  odds?: number
  payout: number
  result: BetResult
  notes?: string
  combinedId?: number
  bettingProfileId?: number | null
}

export interface BetUpdateInput extends Partial<BetCreateInput> {}

export interface BetResultUpdate {
  result: BetResult
  payout: number
}

export interface BetFilters {
  page?: number
  perPage?: number
  dateFrom?: string
  dateTo?: string
  result?: BetResult
  sportId?: number
  bookmakerId?: number
  betType?: BetType
  search?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
}

export interface BetWithRelations {
  id: number
  date: Date
  description: string
  sport: { id: number; name: string; icon: string | null } | null
  bookmaker: { id: number; name: string; color: string }
  betType: BetType
  isCombined: boolean
  amountWagered: number
  odds: number | null
  payout: number
  profit: number
  result: BetResult
  notes: string | null
  source: BetSource
  createdAt: Date
}

export interface PaginatedBets {
  data: BetWithRelations[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
  summary: {
    totalWagered: number
    totalProfit: number
    hitRatePct: number | null
    totalBets: number
  }
}
