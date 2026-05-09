import { prisma } from '../lib/prisma'
import { calculateProfit, calculateHitRate, calculateRoi } from '../utils/calculations'
import { SportStat, BookmakerStat, BetTypeStat, MonthlyStats } from '../types/dashboard.types'

interface DateFilter { dateFrom?: string; dateTo?: string }

function buildDateWhere(filters: DateFilter) {
  const where: any = { result: { not: 'pending' } }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom)
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo)
  }
  return where
}

export async function getStatsBySport(filters: DateFilter): Promise<SportStat[]> {
  const bets = await prisma.bet.findMany({
    where: { ...buildDateWhere(filters), sportId: { not: null } },
    include: { sport: true },
  })

  const grouped = new Map<number, { sport: any; bets: typeof bets }>()
  for (const bet of bets) {
    if (!bet.sport) continue
    const entry = grouped.get(bet.sportId!) ?? { sport: bet.sport, bets: [] }
    entry.bets.push(bet)
    grouped.set(bet.sportId!, entry)
  }

  return Array.from(grouped.values()).map(({ sport, bets: sb }) => {
    const won = sb.filter((b) => b.result === 'won').length
    const lost = sb.filter((b) => b.result === 'lost').length
    const totalWagered = sb.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit = sb.reduce((s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0)
    return {
      sport: sport.name,
      icon: sport.icon,
      totalBets: sb.length,
      won,
      lost,
      hitRatePct: calculateHitRate(won, lost),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      avgProfitPerBet: parseFloat((totalProfit / sb.length).toFixed(2)),
    }
  }).sort((a, b) => b.totalProfit - a.totalProfit)
}

export async function getStatsByBookmaker(filters: DateFilter): Promise<BookmakerStat[]> {
  const bets = await prisma.bet.findMany({
    where: buildDateWhere(filters),
    include: { bookmaker: true },
  })

  const grouped = new Map<number, { bookmaker: any; bets: typeof bets }>()
  for (const bet of bets) {
    const entry = grouped.get(bet.bookmakerId) ?? { bookmaker: bet.bookmaker, bets: [] }
    entry.bets.push(bet)
    grouped.set(bet.bookmakerId, entry)
  }

  return Array.from(grouped.values()).map(({ bookmaker, bets: bb }) => {
    const won = bb.filter((b) => b.result === 'won').length
    const lost = bb.filter((b) => b.result === 'lost').length
    const totalWagered = bb.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit = bb.reduce((s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0)
    return {
      bookmaker: bookmaker.name,
      color: bookmaker.color,
      totalBets: bb.length,
      won,
      lost,
      hitRatePct: calculateHitRate(won, lost),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      avgProfitPerBet: parseFloat((totalProfit / bb.length).toFixed(2)),
    }
  }).sort((a, b) => b.totalProfit - a.totalProfit)
}

export async function getStatsByBetType(filters: DateFilter): Promise<{ data: BetTypeStat[]; recommendation: string }> {
  const bets = await prisma.bet.findMany({ where: buildDateWhere(filters) })

  const types = ['simple', 'combined'] as const
  const data: BetTypeStat[] = types.map((betType) => {
    const typeBets = bets.filter((b) => b.betType === betType)
    const won = typeBets.filter((b) => b.result === 'won').length
    const lost = typeBets.filter((b) => b.result === 'lost').length
    const totalWagered = typeBets.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit = typeBets.reduce((s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0)
    return {
      betType,
      totalBets: typeBets.length,
      won,
      lost,
      hitRatePct: calculateHitRate(won, lost),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      roiPct: calculateRoi(totalProfit, totalWagered),
    }
  })

  const [simple, combined] = data
  let recommendation = 'Dados insuficientes para gerar recomendação.'
  if (simple.totalBets > 0 && combined.totalBets > 0) {
    const better = simple.roiPct >= combined.roiPct ? 'simples' : 'combinadas'
    const diff = Math.abs(simple.roiPct - combined.roiPct).toFixed(1)
    recommendation = `Suas apostas ${better} têm ROI ${diff}% maior.`
  }

  return { data, recommendation }
}

export async function getMonthlyStats(): Promise<MonthlyStats[]> {
  const bets = await prisma.bet.findMany({
    where: {
      result: { not: 'pending' },
      date: { gte: new Date(new Date().getFullYear() - 1, new Date().getMonth() + 1, 1) },
    },
    orderBy: { date: 'asc' },
  })

  const grouped = new Map<string, typeof bets>()
  for (const bet of bets) {
    const key = `${bet.date.getFullYear()}-${String(bet.date.getMonth() + 1).padStart(2, '0')}`
    grouped.set(key, [...(grouped.get(key) ?? []), bet])
  }

  return Array.from(grouped.entries()).map(([month, mb]) => {
    const won = mb.filter((b) => b.result === 'won').length
    const lost = mb.filter((b) => b.result === 'lost').length
    const totalProfit = mb.reduce((s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0)
    return {
      month,
      totalBets: mb.length,
      won,
      lost,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      hitRatePct: calculateHitRate(won, lost),
    }
  })
}
