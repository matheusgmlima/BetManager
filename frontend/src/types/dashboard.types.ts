export type DashboardPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

export interface DashboardSummary {
  totalBets: number
  won: number
  lost: number
  void: number
  pending: number
  simpleCount: number
  combinedCount: number
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
  pendingBets: Array<{ id: number; date: string; match: string | null; market: string; bookmaker: string; amountWagered: number }>
  goal: GoalProgress | null
  recentBets: Array<{ id: number; date: string; match: string | null; market: string; bookmaker: string; profit: number; result: string }>
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

export interface ProfileStat {
  profile: string
  profileId: number | null
  totalBets: number
  won: number
  lost: number
  hitRatePct: number | null
  totalWagered: number
  totalProfit: number
  roi?: number | null
}

export interface TipsterStat {
  tipster: string
  tipsterId: number | null
  totalBets: number
  won: number
  lost: number
  hitRatePct: number | null
  totalWagered: number
  totalProfit: number
  roi: number | null
}

export interface Goal {
  id: number
  month: number
  year: number
  targetProfit: number
  actualProfit: number
  totalWagered: number
  totalBets: number
  won: number
  lost: number
  hitRatePct: number | null
  roi: number | null
  progressPct: number
  achieved: boolean
  isCurrentMonth: boolean
  profileBreakdown: ProfileStat[]
}

export interface MonthAnalytics {
  month: number
  totalBets: number
  won: number
  lost: number
  totalWagered: number
  totalProfit: number
  hitRatePct: number | null
  roi: number | null
  targetProfit: number | null
  goalId: number | null
  achieved: boolean | null
  progressPct: number | null
}

export interface YearAnalyticsSummary {
  totalBets: number
  won: number
  lost: number
  totalWagered: number
  totalProfit: number
  hitRatePct: number | null
  roi: number | null
  goalsSet: number
  goalsHit: number
  bestMonth: number | null
  bestProfit: number | null
  worstMonth: number | null
  worstProfit: number | null
}

export interface YearAnalytics {
  year: number
  months: MonthAnalytics[]
  summary: YearAnalyticsSummary
  profileBreakdown: ProfileStat[]
}

export interface PeriodAnalytics {
  dateFrom: string
  dateTo: string
  summary: {
    totalBets: number
    won: number
    lost: number
    totalWagered: number
    totalProfit: number
    hitRatePct: number | null
    roi: number | null
  }
  profileBreakdown: ProfileStat[]
}
