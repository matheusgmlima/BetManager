export type BetResult = 'won' | 'lost' | 'void' | 'pending' | 'cashout'
export type BetType = 'simple' | 'combined'

export interface Sport {
  id: number
  name: string
  icon: string | null
  active: boolean
}

export interface Bookmaker {
  id: number
  name: string
  color: string
  active: boolean
}

export interface BettingProfile {
  id: number
  name: string
  active: boolean
}

export interface Tipster {
  id: number
  name: string
  active: boolean
}

export interface Bet {
  id: number
  date: string
  match: string | null
  market: string
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
  source: 'manual' | 'ai_extract'
  createdAt: string
  bettingProfile?: { id: number; name: string } | null
  tipster?: { id: number; name: string } | null
}

export interface BetCreateInput {
  date: string
  match?: string | null
  market: string
  sportId?: number
  bookmakerId: number
  betType: BetType
  amountWagered: number
  odds?: number | null
  payout: number
  result: BetResult
  notes?: string
  bettingProfileId?: number | null
  tipsterId?: number | null
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
  bettingProfileId?: number
  tipsterId?: number
  search?: string
}

export interface PaginatedBets {
  data: Bet[]
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

export interface AiExtractedBet {
  date: string | null
  match: string | null
  market: string | null
  bookmaker: string | null
  bookmakerId: number | null
  amountWagered: number | null
  odds: number | null
  payout: number | null
  result: BetResult | null
  confidence: 'high' | 'medium' | 'low'
  betType: BetType
}

export interface AiExtractionResponse {
  extractionId: number
  modelUsed: string
  betsDetected: number
  bets: AiExtractedBet[]
  warnings: string[]
}
