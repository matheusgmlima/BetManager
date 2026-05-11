export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  detail: string
  errorCode?: string
  field?: string
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
  result: 'won' | 'lost' | 'void' | 'pending' | null
  confidence: 'high' | 'medium' | 'low'
}

export interface AiExtractionResponse {
  extractionId: number
  modelUsed: string
  betsDetected: number
  bets: AiExtractedBet[]
  warnings: string[]
}
