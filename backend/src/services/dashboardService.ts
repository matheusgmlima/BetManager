import { prisma } from '../lib/prisma'
import { calculateProfit, calculateHitRate } from '../utils/calculations'
import { getPeriodRange, daysRemainingInMonth, toDateString } from '../utils/dateUtils'
import { DashboardPeriod, DashboardData } from '../types/dashboard.types'

export async function getDashboard(period: DashboardPeriod): Promise<DashboardData> {
  const { from, to } = getPeriodRange(period)

  const bets = await prisma.bet.findMany({
    where: { date: { gte: from, lte: to } },
    include: { bookmaker: true },
    orderBy: { date: 'asc' },
  })

  const resolved = bets.filter((b) => b.result !== 'pending')
  const won = resolved.filter((b) => b.result === 'won').length
  const lost = resolved.filter((b) => b.result === 'lost').length
  const voidBets = resolved.filter((b) => b.result === 'void').length
  const pending = bets.filter((b) => b.result === 'pending').length
  const simpleCount   = bets.filter((b) => b.betType === 'simple').length
  const combinedCount = bets.filter((b) => b.betType === 'combined').length

  const totalWagered = bets.reduce((s, b) => s + Number(b.amountWagered), 0)
  const totalPayout  = bets.reduce((s, b) => s + Number(b.payout), 0)
  const totalProfit  = resolved.reduce((s, b) => {
    const amount = Number(b.amountWagered)
    return s + (b.result === 'lost' ? -amount : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), amount))
  }, 0)
  const avgOdds = resolved.length > 0
    ? resolved.reduce((s, b) => s + (b.odds ? Number(b.odds) : 0), 0) / resolved.filter((b) => b.odds).length
    : null

  // Profit chart — agrupado por dia
  const profitByDay = new Map<string, number>()
  for (const bet of resolved) {
    const key    = toDateString(bet.date)
    const amount = Number(bet.amountWagered)
    const profit = bet.result === 'lost' ? -amount
                 : bet.result === 'void' ? 0
                 : calculateProfit(Number(bet.payout), amount)
    profitByDay.set(key, (profitByDay.get(key) ?? 0) + profit)
  }

  let cumulative = 0
  const profitChart = Array.from(profitByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dailyProfit]) => {
      cumulative += dailyProfit
      return { date, dailyProfit: parseFloat(dailyProfit.toFixed(2)), cumulativeProfit: parseFloat(cumulative.toFixed(2)) }
    })

  // Apostas pendentes
  const pendingBets = bets
    .filter((b) => b.result === 'pending')
    .map((b) => ({
      id: b.id,
      date: toDateString(b.date),
      match: b.match ?? null,
      market: b.market,
      bookmaker: b.bookmaker.name,
      amountWagered: Number(b.amountWagered),
    }))

  // Meta do mês atual
  const now = new Date()
  const currentGoal = await prisma.goal.findUnique({
    where: { month_year: { month: now.getMonth() + 1, year: now.getFullYear() } },
  })

  let goal = null
  if (currentGoal) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthBets = await prisma.bet.findMany({
      where: { date: { gte: monthStart }, result: { not: 'pending' } },
    })
    const monthProfit = monthBets.reduce(
      (s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0
    )
    const targetProfit = Number(currentGoal.targetProfit)
    const daysRemaining = daysRemainingInMonth()
    const progressPct = parseFloat(((monthProfit / targetProfit) * 100).toFixed(1))
    const remaining = targetProfit - monthProfit
    const dailyNeeded = daysRemaining > 0 ? parseFloat((remaining / daysRemaining).toFixed(2)) : 0

    goal = {
      month: currentGoal.month,
      year: currentGoal.year,
      targetProfit,
      currentProfit: parseFloat(monthProfit.toFixed(2)),
      progressPct,
      daysRemaining,
      dailyNeeded,
    }
  }

  // Últimas 5 apostas
  const recentBets = bets
    .slice(-5)
    .reverse()
    .map((b) => ({
      id: b.id,
      date: toDateString(b.date),
      match: b.match ?? null,
      market: b.market,
      bookmaker: b.bookmaker.name,
      profit: calculateProfit(Number(b.payout), Number(b.amountWagered)),
      result: b.result,
    }))

  return {
    period,
    summary: {
      totalBets: bets.length,
      won,
      lost,
      void: voidBets,
      pending,
      simpleCount,
      combinedCount,
      hitRatePct: calculateHitRate(won, lost),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      totalPayout: parseFloat(totalPayout.toFixed(2)),
      totalProfit,
      avgOdds: avgOdds ? parseFloat(avgOdds.toFixed(4)) : null,
    },
    profitChart,
    pendingBets,
    goal,
    recentBets,
  }
}
