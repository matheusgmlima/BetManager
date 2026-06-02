import { prisma } from '../lib/prisma'
import { calculateProfit, calculateHitRate, calculateRoi } from '../utils/calculations'
import { SportStat, BookmakerStat, BetTypeStat, MonthlyStats } from '../types/dashboard.types'

interface DateFilter { dateFrom?: string; dateTo?: string }

function buildDateWhere(userId: number, filters: DateFilter) {
  const where: any = { userId, result: { not: 'pending' } }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom)
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo)
  }
  return where
}

export async function getStatsBySport(userId: number, filters: DateFilter): Promise<SportStat[]> {
  const bets = await prisma.bet.findMany({
    where: { ...buildDateWhere(userId, filters), sportId: { not: null } },
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
    const cashout = sb.filter((b) => b.result === 'cashout').length
    const totalWagered = sb.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit = sb.reduce((s, b) => {
      const a = Number(b.amountWagered)
      return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
    }, 0)
    return {
      sport: sport.name,
      icon: sport.icon,
      totalBets: sb.length,
      won,
      lost,
      hitRatePct: calculateHitRate(won, lost, cashout),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      avgProfitPerBet: parseFloat((totalProfit / sb.length).toFixed(2)),
    }
  }).sort((a, b) => b.totalProfit - a.totalProfit)
}

export async function getStatsByBookmaker(userId: number, filters: DateFilter): Promise<BookmakerStat[]> {
  const bets = await prisma.bet.findMany({
    where: buildDateWhere(userId, filters),
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
    const cashout = bb.filter((b) => b.result === 'cashout').length
    const totalWagered = bb.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit = bb.reduce((s, b) => {
      const a = Number(b.amountWagered)
      return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
    }, 0)
    return {
      bookmaker: bookmaker.name,
      color: bookmaker.color,
      totalBets: bb.length,
      won,
      lost,
      hitRatePct: calculateHitRate(won, lost, cashout),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      avgProfitPerBet: parseFloat((totalProfit / bb.length).toFixed(2)),
    }
  }).sort((a, b) => b.totalProfit - a.totalProfit)
}

export async function getStatsByBetType(userId: number, filters: DateFilter): Promise<{ data: BetTypeStat[]; recommendation: string }> {
  const bets = await prisma.bet.findMany({ where: buildDateWhere(userId, filters) })

  const types = ['simple', 'combined'] as const
  const data: BetTypeStat[] = types.map((betType) => {
    const typeBets = bets.filter((b) => b.betType === betType)
    const won = typeBets.filter((b) => b.result === 'won').length
    const lost = typeBets.filter((b) => b.result === 'lost').length
    const cashout = typeBets.filter((b) => b.result === 'cashout').length
    const totalWagered = typeBets.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit = typeBets.reduce((s, b) => {
      const a = Number(b.amountWagered)
      return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
    }, 0)
    return {
      betType,
      totalBets: typeBets.length,
      won,
      lost,
      hitRatePct: calculateHitRate(won, lost, cashout),
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

export async function getStatsByProfile(userId: number, filters: DateFilter) {
  const allBets = await prisma.bet.findMany({
    where: buildDateWhere(userId, filters),
    include: { bettingProfile: true },
  })
  const totalBetsPerProfile = await prisma.bet.findMany({
    where: {
      userId,
      ...(filters.dateFrom || filters.dateTo ? {
        date: {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
        }
      } : {}),
    },
    include: { bettingProfile: true },
  })

  const grouped = new Map<string, { profile: any; resolved: typeof allBets; total: typeof allBets }>()

  for (const bet of totalBetsPerProfile) {
    const key = bet.bettingProfile?.name ?? 'Sem perfil'
    const entry = grouped.get(key) ?? { profile: bet.bettingProfile, resolved: [], total: [] }
    entry.total.push(bet)
    grouped.set(key, entry)
  }
  for (const bet of allBets) {
    const key = bet.bettingProfile?.name ?? 'Sem perfil'
    const entry = grouped.get(key)
    if (entry) entry.resolved.push(bet)
  }

  return Array.from(grouped.entries()).map(([name, { profile, resolved, total }]) => {
    const won = resolved.filter((b) => b.result === 'won').length
    const lost = resolved.filter((b) => b.result === 'lost').length
    const cashout = resolved.filter((b) => b.result === 'cashout').length
    const totalWagered = total.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit = resolved.reduce((s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0)
    return {
      profile: name,
      profileId: profile?.id ?? null,
      totalBets: total.length,
      won,
      lost,
      hitRatePct: calculateHitRate(won, lost, cashout),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
    }
  }).sort((a, b) => b.totalProfit - a.totalProfit)
}

const ODDS_RANGES = [
  { label: '< 1.30',    emoji: '🐢', min: 0,    max: 1.30 },
  { label: '1.30–1.60', emoji: '🟢', min: 1.30, max: 1.60 },
  { label: '1.60–2.00', emoji: '🔵', min: 1.60, max: 2.00 },
  { label: '2.00–2.50', emoji: '🟡', min: 2.00, max: 2.50 },
  { label: '2.50–3.00', emoji: '🟠', min: 2.50, max: 3.00 },
  { label: '3.00–5.00', emoji: '🎯', min: 3.00, max: 5.00 },
  { label: '5.00+',     emoji: '🔥', min: 5.00, max: Infinity },
]

function calcStreaks(bets: any[]) {
  let bestWin = 0, bestLoss = 0, tempCount = 0, tempType = ''
  for (const b of bets) {
    if (b.result === 'void') continue
    if (b.result === tempType) { tempCount++ }
    else { tempType = b.result; tempCount = 1 }
    if (tempType === 'won'  && tempCount > bestWin)  bestWin  = tempCount
    if (tempType === 'lost' && tempCount > bestLoss) bestLoss = tempCount
  }

  let currentType: 'won' | 'lost' | null = null
  let current = 0
  for (let i = bets.length - 1; i >= 0; i--) {
    const b = bets[i]
    if (b.result === 'void') continue
    if (!currentType) { currentType = b.result as 'won' | 'lost'; current = 1 }
    else if (b.result === currentType) current++
    else break
  }

  return { current, currentType, bestWin, bestLoss }
}

export async function getProfileDetail(userId: number, profileIdParam: string | undefined) {
  let where: any = { userId, result: { not: 'pending' } }

  if (profileIdParam === undefined || profileIdParam === '') {
    // aggregate ALL profiles
  } else if (profileIdParam === 'null') {
    where.bettingProfileId = null
  } else {
    where.bettingProfileId = parseInt(profileIdParam)
  }

  const bets = await prisma.bet.findMany({ where, orderBy: { date: 'asc' } })

  if (!bets.length) {
    return {
      totalBets: 0, won: 0, lost: 0,
      oddsRanges: [], simpleVsCombined: null,
      bingos: null, sweetSpot: null, streaks: null,
      topWins: [], worstLosses: [],
      avgOddsWon: null, avgOddsLost: null,
    }
  }

  const won  = bets.filter(b => b.result === 'won').length
  const lost = bets.filter(b => b.result === 'lost').length
  const cashout = bets.filter((b) => b.result === 'cashout').length

  const oddsRanges = ODDS_RANGES.map(r => {
    const rb   = bets.filter(b => { const o = Number(b.odds); return o >= r.min && o < r.max })
    const rWon = rb.filter(b => b.result === 'won').length
    const rLost = rb.filter(b => b.result === 'lost').length
    const settled = rWon + rLost
    const totalWagered = rb.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit  = rb.reduce((s, b) => {
      const a = Number(b.amountWagered)
      return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
    }, 0)
    const oddsVals = rb.filter(b => b.odds != null)
    const avgOdds = oddsVals.length > 0
      ? oddsVals.reduce((s, b) => s + Number(b.odds), 0) / oddsVals.length
      : null
    const expectedHitRatePct = avgOdds ? parseFloat((100 / avgOdds).toFixed(1)) : null
    return {
      label: r.label,
      emoji: r.emoji,
      total: rb.length,
      won: rWon,
      lost: rLost,
      hitRatePct: settled > 0 ? parseFloat(((rWon / settled) * 100).toFixed(1)) : null,
      expectedHitRatePct,
      avgOdds: avgOdds ? parseFloat(avgOdds.toFixed(2)) : null,
      roi: totalWagered > 0 ? parseFloat(((totalProfit / totalWagered) * 100).toFixed(1)) : null,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
    }
  }).filter(r => r.total > 0)

  const calcType = (type: 'simple' | 'combined') => {
    const tb = bets.filter(b => b.betType === type)
    const w  = tb.filter(b => b.result === 'won').length
    const l  = tb.filter(b => b.result === 'lost').length
    const tw = tb.reduce((s, b) => s + Number(b.amountWagered), 0)
    const tp = tb.reduce((s, b) => {
      const a = Number(b.amountWagered)
      return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
    }, 0)
    return {
      total: tb.length, won: w, lost: l,
      hitRatePct: w + l > 0 ? parseFloat(((w / (w + l)) * 100).toFixed(1)) : null,
      roi: tw > 0 ? parseFloat(((tp / tw) * 100).toFixed(1)) : null,
      totalProfit: parseFloat(tp.toFixed(2)),
    }
  }
  const simpleVsCombined = {
    simple:   calcType('simple'),
    combined: calcType('combined'),
  }

  const bingoBets = bets.filter(b => Number(b.odds) >= 3)
  const bingoWon  = bingoBets.filter(b => b.result === 'won')
  const superBets = bets.filter(b => Number(b.odds) >= 5)
  const superWon  = superBets.filter(b => b.result === 'won')

  const bingos = {
    total:    bingoBets.length,
    won:      bingoWon.length,
    hitRatePct: bingoBets.length > 0 ? parseFloat(((bingoWon.length / bingoBets.length) * 100).toFixed(1)) : null,
    biggestOdds: bingoWon.length > 0 ? parseFloat(Math.max(...bingoWon.map(b => Number(b.odds))).toFixed(2)) : null,
    super: {
      total:      superBets.length,
      won:        superWon.length,
      hitRatePct: superBets.length > 0 ? parseFloat(((superWon.length / superBets.length) * 100).toFixed(1)) : null,
    },
  }

  const qualified = oddsRanges.filter(r => r.total >= 3 && r.roi !== null && r.roi > 0)
  const sweetSpot = qualified.length
    ? qualified.reduce((a, b) => (b.roi! > a.roi! ? b : a))
    : null

  const streaks = calcStreaks(bets)

  const withProfit = bets.map(b => {
    const a = Number(b.amountWagered)
    const profit = b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a)
    return { ...b, profit }
  })

  const topWins = [...withProfit]
    .filter(b => b.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5)
    .map(b => ({
      match:  b.match ?? '—',
      market: b.market,
      odds:   Number(b.odds),
      profit: parseFloat(b.profit.toFixed(2)),
      date:   b.date.toISOString().split('T')[0],
      isCombined: b.betType === 'combined',
    }))

  const worstLosses = [...withProfit]
    .filter(b => b.profit < 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 5)
    .map(b => ({
      match:  b.match ?? '—',
      market: b.market,
      odds:   Number(b.odds),
      loss:   parseFloat(Math.abs(b.profit).toFixed(2)),
      date:   b.date.toISOString().split('T')[0],
      isCombined: b.betType === 'combined',
    }))

  const wonBets  = bets.filter(b => b.result === 'won')
  const lostBets = bets.filter(b => b.result === 'lost')
  const avgOddsWon  = wonBets.length  ? parseFloat((wonBets.reduce((s, b) => s + Number(b.odds), 0) / wonBets.length).toFixed(2))  : null
  const avgOddsLost = lostBets.length ? parseFloat((lostBets.reduce((s, b) => s + Number(b.odds), 0) / lostBets.length).toFixed(2)) : null

  return {
    totalBets: bets.length, won, lost,
    oddsRanges,
    simpleVsCombined,
    bingos,
    sweetSpot: sweetSpot ? { label: sweetSpot.label, emoji: sweetSpot.emoji, roi: sweetSpot.roi, hitRatePct: sweetSpot.hitRatePct, total: sweetSpot.total } : null,
    streaks,
    topWins,
    worstLosses,
    avgOddsWon,
    avgOddsLost,
  }
}

export async function getTipsterDetail(userId: number, tipsterIdParam: string | undefined) {
  let where: any = { userId, result: { not: 'pending' } }

  if (tipsterIdParam === undefined || tipsterIdParam === '') {
    // aggregate ALL tipsters
  } else if (tipsterIdParam === 'null') {
    where.tipsterId = null
  } else {
    where.tipsterId = parseInt(tipsterIdParam)
  }

  const bets = await prisma.bet.findMany({ where, orderBy: { date: 'asc' } })

  if (!bets.length) {
    return {
      totalBets: 0, won: 0, lost: 0,
      oddsRanges: [], simpleVsCombined: null,
      bingos: null, sweetSpot: null, streaks: null,
      topWins: [], worstLosses: [],
      avgOddsWon: null, avgOddsLost: null,
    }
  }

  const won  = bets.filter(b => b.result === 'won').length
  const lost = bets.filter(b => b.result === 'lost').length
  const cashout = bets.filter((b) => b.result === 'cashout').length

  const oddsRanges = ODDS_RANGES.map(r => {
    const rb   = bets.filter(b => { const o = Number(b.odds); return o >= r.min && o < r.max })
    const rWon = rb.filter(b => b.result === 'won').length
    const rLost = rb.filter(b => b.result === 'lost').length
    const settled = rWon + rLost
    const totalWagered = rb.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit  = rb.reduce((s, b) => {
      const a = Number(b.amountWagered)
      return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
    }, 0)
    const oddsVals = rb.filter(b => b.odds != null)
    const avgOdds = oddsVals.length > 0
      ? oddsVals.reduce((s, b) => s + Number(b.odds), 0) / oddsVals.length
      : null
    const expectedHitRatePct = avgOdds ? parseFloat((100 / avgOdds).toFixed(1)) : null
    return {
      label: r.label, emoji: r.emoji, total: rb.length, won: rWon, lost: rLost,
      hitRatePct: settled > 0 ? parseFloat(((rWon / settled) * 100).toFixed(1)) : null,
      expectedHitRatePct,
      avgOdds: avgOdds ? parseFloat(avgOdds.toFixed(2)) : null,
      roi: totalWagered > 0 ? parseFloat(((totalProfit / totalWagered) * 100).toFixed(1)) : null,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
    }
  }).filter(r => r.total > 0)

  const calcType = (type: 'simple' | 'combined') => {
    const tb = bets.filter(b => b.betType === type)
    const w  = tb.filter(b => b.result === 'won').length
    const l  = tb.filter(b => b.result === 'lost').length
    const tw = tb.reduce((s, b) => s + Number(b.amountWagered), 0)
    const tp = tb.reduce((s, b) => {
      const a = Number(b.amountWagered)
      return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
    }, 0)
    return {
      total: tb.length, won: w, lost: l,
      hitRatePct: w + l > 0 ? parseFloat(((w / (w + l)) * 100).toFixed(1)) : null,
      roi: tw > 0 ? parseFloat(((tp / tw) * 100).toFixed(1)) : null,
      totalProfit: parseFloat(tp.toFixed(2)),
    }
  }
  const simpleVsCombined = { simple: calcType('simple'), combined: calcType('combined') }

  const bingoBets = bets.filter(b => Number(b.odds) >= 3)
  const bingoWon  = bingoBets.filter(b => b.result === 'won')
  const superBets = bets.filter(b => Number(b.odds) >= 5)
  const superWon  = superBets.filter(b => b.result === 'won')
  const bingos = {
    total: bingoBets.length, won: bingoWon.length,
    hitRatePct: bingoBets.length > 0 ? parseFloat(((bingoWon.length / bingoBets.length) * 100).toFixed(1)) : null,
    biggestOdds: bingoWon.length > 0 ? parseFloat(Math.max(...bingoWon.map(b => Number(b.odds))).toFixed(2)) : null,
    super: {
      total: superBets.length, won: superWon.length,
      hitRatePct: superBets.length > 0 ? parseFloat(((superWon.length / superBets.length) * 100).toFixed(1)) : null,
    },
  }

  const qualified = oddsRanges.filter(r => r.total >= 3 && r.roi !== null && r.roi > 0)
  const sweetSpot = qualified.length ? qualified.reduce((a, b) => (b.roi! > a.roi! ? b : a)) : null
  const streaks   = calcStreaks(bets)

  const withProfit = bets.map(b => {
    const a = Number(b.amountWagered)
    const profit = b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a)
    return { ...b, profit }
  })

  const topWins = [...withProfit].filter(b => b.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 5)
    .map(b => ({ match: b.match ?? '—', market: b.market, odds: Number(b.odds), profit: parseFloat(b.profit.toFixed(2)), date: b.date.toISOString().split('T')[0], isCombined: b.betType === 'combined' }))

  const worstLosses = [...withProfit].filter(b => b.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 5)
    .map(b => ({ match: b.match ?? '—', market: b.market, odds: Number(b.odds), loss: parseFloat(Math.abs(b.profit).toFixed(2)), date: b.date.toISOString().split('T')[0], isCombined: b.betType === 'combined' }))

  const wonBets  = bets.filter(b => b.result === 'won')
  const lostBets = bets.filter(b => b.result === 'lost')
  const avgOddsWon  = wonBets.length  ? parseFloat((wonBets.reduce((s, b) => s + Number(b.odds), 0) / wonBets.length).toFixed(2))  : null
  const avgOddsLost = lostBets.length ? parseFloat((lostBets.reduce((s, b) => s + Number(b.odds), 0) / lostBets.length).toFixed(2)) : null

  return {
    totalBets: bets.length, won, lost,
    oddsRanges, simpleVsCombined, bingos,
    sweetSpot: sweetSpot ? { label: sweetSpot.label, emoji: sweetSpot.emoji, roi: sweetSpot.roi, hitRatePct: sweetSpot.hitRatePct, total: sweetSpot.total } : null,
    streaks, topWins, worstLosses, avgOddsWon, avgOddsLost,
  }
}

export async function getMonthlyStats(userId: number): Promise<MonthlyStats[]> {
  const bets = await prisma.bet.findMany({
    where: {
      userId,
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
    const cashout = mb.filter((b) => b.result === 'cashout').length
    const totalProfit = mb.reduce((s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0)
    return {
      month,
      totalBets: mb.length,
      won,
      lost,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      hitRatePct: calculateHitRate(won, lost, cashout),
    }
  })
}

export async function getHeatmap(userId: number) {
  const bets = await prisma.bet.findMany({
    where: { userId, result: { not: 'pending' } },
    orderBy: { date: 'asc' },
  })

  const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const days = DAY_NAMES.map((label, day) => ({ day, label, bets: [] as typeof bets }))

  for (const bet of bets) {
    const d = new Date(bet.date).getUTCDay()
    days[d].bets.push(bet)
  }

  return days.map(({ day, label, bets: db }) => {
    const won  = db.filter(b => b.result === 'won').length
    const lost = db.filter(b => b.result === 'lost').length
    const cashout = db.filter((b) => b.result === 'cashout').length
    const totalWagered = db.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit  = db.reduce((s, b) => {
      const a = Number(b.amountWagered)
      return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
    }, 0)
    return {
      day, label,
      totalBets: db.length,
      won, lost,
      hitRatePct:  won + lost > 0 ? parseFloat(((won / (won + lost)) * 100).toFixed(1)) : null,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      roi: totalWagered > 0 ? parseFloat(((totalProfit / totalWagered) * 100).toFixed(1)) : null,
      avgProfit: db.length > 0 ? parseFloat((totalProfit / db.length).toFixed(2)) : 0,
    }
  })
}

// ─── Stats by Tipster ─────────────────────────────────────────────────────────

export async function getStatsByTipster(userId: number, filters: DateFilter) {
  const where = {
    userId,
    ...(filters.dateFrom || filters.dateTo ? {
      date: {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
      }
    } : {}),
  }

  const allBets = await prisma.bet.findMany({
    where: { ...where, result: { not: 'pending' } },
    include: { tipster: true },
  })
  const totalBets = await prisma.bet.findMany({
    where,
    include: { tipster: true },
  })

  const grouped = new Map<string, { tipster: any; resolved: typeof allBets; total: typeof totalBets }>()

  for (const bet of totalBets) {
    const key = bet.tipster?.name ?? 'Sem tipster'
    const entry = grouped.get(key) ?? { tipster: bet.tipster, resolved: [], total: [] }
    entry.total.push(bet)
    grouped.set(key, entry)
  }
  for (const bet of allBets) {
    const key = bet.tipster?.name ?? 'Sem tipster'
    const entry = grouped.get(key)
    if (entry) entry.resolved.push(bet)
  }

  return Array.from(grouped.entries()).map(([name, { tipster, resolved, total }]) => {
    const won = resolved.filter((b) => b.result === 'won').length
    const lost = resolved.filter((b) => b.result === 'lost').length
    const cashout = resolved.filter((b) => b.result === 'cashout').length
    const totalWagered = total.reduce((s, b) => s + Number(b.amountWagered), 0)
    const totalProfit  = resolved.reduce((s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0)
    return {
      tipster: name,
      tipsterId: tipster?.id ?? null,
      totalBets: total.length,
      won,
      lost,
      hitRatePct: calculateHitRate(won, lost, cashout),
      totalWagered: parseFloat(totalWagered.toFixed(2)),
      totalProfit:  parseFloat(totalProfit.toFixed(2)),
      roi: calculateRoi(totalProfit, totalWagered),
    }
  }).sort((a, b) => b.totalProfit - a.totalProfit)
}

export interface PeriodSummary {
  totalBets: number
  won: number
  lost: number
  void: number
  pending: number
  hitRatePct: number | null
  totalWagered: number
  totalProfit: number
  roi: number
  avgOdds: number | null
}

export async function getPeriodSummary(userId: number, dateFrom?: string, dateTo?: string): Promise<PeriodSummary> {
  const where: any = { userId }
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = new Date(dateFrom)
    if (dateTo)   where.date.lte = new Date(dateTo)
  }

  const bets = await prisma.bet.findMany({ where })
  const resolved = bets.filter(b => b.result !== 'pending')
  const won      = resolved.filter(b => b.result === 'won').length
  const lost     = resolved.filter(b => b.result === 'lost').length
  const cashout  = resolved.filter(b => b.result === 'cashout').length
  const voidB    = resolved.filter(b => b.result === 'void').length
  const pending  = bets.filter(b => b.result === 'pending').length

  const totalWagered = resolved.reduce((s, b) => s + Number(b.amountWagered), 0)
  const totalProfit  = resolved.reduce((s, b) => {
    const a = Number(b.amountWagered)
    return s + (b.result === 'lost' ? -a : b.result === 'void' ? 0 : calculateProfit(Number(b.payout), a))
  }, 0)

  const oddsArr = resolved.filter(b => b.odds).map(b => Number(b.odds))
  const avgOdds = oddsArr.length > 0 ? oddsArr.reduce((s, v) => s + v, 0) / oddsArr.length : null

  return {
    totalBets: bets.length,
    won,
    lost,
    void: voidB,
    pending,
    hitRatePct: calculateHitRate(won, lost, cashout),
    totalWagered: parseFloat(totalWagered.toFixed(2)),
    totalProfit: parseFloat(totalProfit.toFixed(2)),
    roi: calculateRoi(totalProfit, totalWagered),
    avgOdds: avgOdds ? parseFloat(avgOdds.toFixed(4)) : null,
  }
}
