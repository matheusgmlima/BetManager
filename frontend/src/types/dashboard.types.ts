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
  pendingBets: Array<{ id: number; date: string; description: string; bookmaker: string; amountWagered: number }>
  goal: GoalProgress | null
  recentBets: Array<{ id: number; date: string; description: string; bookmaker: string; profit: number; result: string }>
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

export interface Goal {
  id: number
  month: number
  year: number
  targetProfit: number
  actualProfit: number
  progressPct: number
  achieved: boolean
  isCurrentMonth: boolean
}
