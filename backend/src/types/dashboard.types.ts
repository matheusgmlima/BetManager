export type DashboardPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

export interface DashboardSummary {
  totalBets: number
  won: number
  lost: number
  void: number
  pending: number
  hitRatePct: number | null
  totalWagered: number
  totalPayout: number
  totalProfit: number
  avgOdds: number | null
}

export interface ProfitChartPoint {
  date: string
  dailyProfit: number
  cumulativeProfit: number
}

export interface PendingBet {
  id: number
  date: string
  description: string
  bookmaker: string
  amountWagered: number
}

export interface GoalProgress {
  month: number
  year: number
  targetProfit: number
  currentProfit: number
  progressPct: number
  daysRemaining: number
  dailyNeeded: number
}

export interface DashboardData {
  period: DashboardPeriod
  summary: DashboardSummary
  profitChart: ProfitChartPoint[]
  pendingBets: PendingBet[]
  goal: GoalProgress | null
  recentBets: Array<{
    id: number
    date: string
    description: string
    bookmaker: string
    profit: number
    result: string
  }>
}

export interface SportStat {
  sport: string
  icon: string | null
  totalBets: number
  won: number
  lost: number
  hitRatePct: number | null
  totalWagered: number
  totalProfit: number
  avgProfitPerBet: number
}

export interface BookmakerStat {
  bookmaker: string
  color: string
  totalBets: number
  won: number
  lost: number
  hitRatePct: number | null
  totalWagered: number
  totalProfit: number
  avgProfitPerBet: number
}

export interface BetTypeStat {
  betType: 'simple' | 'combined'
  totalBets: number
  won: number
  lost: number
  hitRatePct: number | null
  totalWagered: number
  totalProfit: number
  roiPct: number
}

export interface MonthlyStats {
  month: string
  totalBets: number
  won: number
  lost: number
  totalProfit: number
  hitRatePct: number | null
}
