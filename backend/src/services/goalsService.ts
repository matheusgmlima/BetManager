import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'
import { betProfit, calculateHitRate } from '../utils/calculations'
import { CreateGoalInput, UpdateGoalInput } from '../validators/goalSchema'

function calcBetStats(bets: any[]) {
  const settled = bets.filter((b) => b.result !== 'pending')
  const won     = settled.filter((b) => b.result === 'won').length
  const lost    = settled.filter((b) => b.result === 'lost').length
  const cashout = settled.filter((b) => b.result === 'cashout').length
  const totalBets     = settled.length
  const totalWagered  = settled.reduce((s, b) => s + Number(b.amountWagered), 0)
  const totalProfit   = settled.reduce((s, b) => s + betProfit(b.result, Number(b.payout), Number(b.amountWagered)), 0)
  const hitRatePct    = calculateHitRate(won, lost, cashout)
  const roi           = totalWagered > 0 ? parseFloat(((totalProfit / totalWagered) * 100).toFixed(2)) : null
  return { totalBets, won, lost, totalWagered, totalProfit, hitRatePct, roi }
}

export async function listGoals(userId: number) {
  const goals = await prisma.goal.findMany({ where: { userId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] })
  const now   = new Date()

  return Promise.all(
    goals.map(async (goal) => {
      const from = new Date(goal.year, goal.month - 1, 1)
      const to   = new Date(goal.year, goal.month, 0, 23, 59, 59)

      const bets = await prisma.bet.findMany({
        where: { userId, date: { gte: from, lte: to } },
        include: { tipster: true },
      })

      const stats        = calcBetStats(bets)
      const targetProfit = Number(goal.targetProfit)
      const progressPct  = targetProfit !== 0
        ? parseFloat(((stats.totalProfit / targetProfit) * 100).toFixed(1))
        : 0

      const isCurrentMonth =
        goal.month === now.getMonth() + 1 && goal.year === now.getFullYear()

      const tipsterMap = new Map<string, { tipsterId: number | null; bets: any[] }>()
      for (const b of bets.filter((b) => b.result !== 'pending')) {
        const name = (b as any).tipster?.name ?? 'Sem tipster'
        const id   = b.tipsterId ?? null
        if (!tipsterMap.has(name)) tipsterMap.set(name, { tipsterId: id, bets: [] })
        tipsterMap.get(name)!.bets.push(b)
      }
      const tipsterBreakdown = Array.from(tipsterMap.entries()).map(([tipster, { tipsterId, bets: tb }]) => {
        const ps = calcBetStats(tb)
        return { profile: tipster, profileId: tipsterId, ...ps }
      })

      return {
        id: goal.id,
        month: goal.month,
        year: goal.year,
        targetProfit,
        actualProfit:     parseFloat(stats.totalProfit.toFixed(2)),
        totalWagered:     parseFloat(stats.totalWagered.toFixed(2)),
        totalBets:        stats.totalBets,
        won:              stats.won,
        lost:             stats.lost,
        hitRatePct:       stats.hitRatePct,
        roi:              stats.roi,
        progressPct,
        achieved:         stats.totalProfit >= targetProfit,
        isCurrentMonth,
        profileBreakdown: tipsterBreakdown,
      }
    })
  )
}

export async function getYearAnalytics(userId: number, year: number) {
  const from = new Date(year, 0, 1)
  const to   = new Date(year, 11, 31, 23, 59, 59)

  const [allBets, goals] = await Promise.all([
    prisma.bet.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: { tipster: true },
    }),
    prisma.goal.findMany({ where: { userId, year } }),
  ])

  const months = Array.from({ length: 12 }, (_, i) => {
    const m     = i + 1
    const mBets = allBets.filter((b) => {
      const d = new Date(b.date)
      return d.getUTCMonth() + 1 === m
    })
    const stats     = calcBetStats(mBets)
    const goal      = goals.find((g) => g.month === m)
    const targetPct = goal && goal.targetProfit
      ? parseFloat(((stats.totalProfit / Number(goal.targetProfit)) * 100).toFixed(1))
      : null

    return {
      month:        m,
      totalBets:    stats.totalBets,
      won:          stats.won,
      lost:         stats.lost,
      totalWagered: parseFloat(stats.totalWagered.toFixed(2)),
      totalProfit:  parseFloat(stats.totalProfit.toFixed(2)),
      hitRatePct:   stats.hitRatePct,
      roi:          stats.roi,
      targetProfit: goal ? Number(goal.targetProfit) : null,
      goalId:       goal?.id ?? null,
      achieved:     goal ? stats.totalProfit >= Number(goal.targetProfit) : null,
      progressPct:  targetPct,
    }
  })

  const yearStats   = calcBetStats(allBets)
  const goalsSet    = goals.length
  const goalsHit    = goals.filter((g) => {
    const m     = g.month
    const mBets = allBets.filter((b) => new Date(b.date).getUTCMonth() + 1 === m)
    const stats = calcBetStats(mBets)
    return stats.totalProfit >= Number(g.targetProfit)
  }).length

  const withBets  = months.filter((m) => m.totalBets > 0)
  const bestMonth = withBets.length
    ? withBets.reduce((a, b) => (b.totalProfit > a.totalProfit ? b : a))
    : null
  const worstMonth = withBets.length
    ? withBets.reduce((a, b) => (b.totalProfit < a.totalProfit ? b : a))
    : null

  const tipsterMap = new Map<string, { tipsterId: number | null; bets: any[] }>()
  for (const b of allBets.filter((b) => b.result !== 'pending')) {
    const name = (b as any).tipster?.name ?? 'Sem tipster'
    const id   = b.tipsterId ?? null
    if (!tipsterMap.has(name)) tipsterMap.set(name, { tipsterId: id, bets: [] })
    tipsterMap.get(name)!.bets.push(b)
  }
  const profileBreakdown = Array.from(tipsterMap.entries()).map(([tipster, { tipsterId, bets: tb }]) => {
    const ps = calcBetStats(tb)
    return { profile: tipster, profileId: tipsterId, ...ps }
  })

  return {
    year,
    months,
    summary: {
      totalBets:    yearStats.totalBets,
      won:          yearStats.won,
      lost:         yearStats.lost,
      totalWagered: parseFloat(yearStats.totalWagered.toFixed(2)),
      totalProfit:  parseFloat(yearStats.totalProfit.toFixed(2)),
      hitRatePct:   yearStats.hitRatePct,
      roi:          yearStats.roi,
      goalsSet,
      goalsHit,
      bestMonth:    bestMonth?.month ?? null,
      bestProfit:   bestMonth?.totalProfit ?? null,
      worstMonth:   worstMonth?.month ?? null,
      worstProfit:  worstMonth?.totalProfit ?? null,
    },
    profileBreakdown,
  }
}

export async function getPeriodAnalytics(userId: number, dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom)
  const to   = new Date(dateTo)
  to.setHours(23, 59, 59)

  const bets = await prisma.bet.findMany({
    where: { userId, date: { gte: from, lte: to } },
    include: { tipster: true },
  })

  const overall = calcBetStats(bets)

  const tipsterMap = new Map<string, { tipsterId: number | null; bets: any[] }>()
  for (const b of bets.filter((b) => b.result !== 'pending')) {
    const name = (b as any).tipster?.name ?? 'Sem tipster'
    const id   = b.tipsterId ?? null
    if (!tipsterMap.has(name)) tipsterMap.set(name, { tipsterId: id, bets: [] })
    tipsterMap.get(name)!.bets.push(b)
  }
  const profileBreakdown = Array.from(tipsterMap.entries()).map(([tipster, { tipsterId, bets: tb }]) => {
    const ps = calcBetStats(tb)
    return { profile: tipster, profileId: tipsterId, ...ps }
  })

  return {
    dateFrom,
    dateTo,
    summary: {
      totalBets:    overall.totalBets,
      won:          overall.won,
      lost:         overall.lost,
      totalWagered: parseFloat(overall.totalWagered.toFixed(2)),
      totalProfit:  parseFloat(overall.totalProfit.toFixed(2)),
      hitRatePct:   overall.hitRatePct,
      roi:          overall.roi,
    },
    profileBreakdown,
  }
}

export async function createGoal(userId: number, data: CreateGoalInput) {
  return prisma.goal.create({ data: { ...data, userId, targetProfit: data.targetProfit } })
}

export async function updateGoal(userId: number, id: number, data: UpdateGoalInput) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } })
  if (!goal) throw new AppError('Meta não encontrada', 404, 'GOAL_NOT_FOUND')
  return prisma.goal.update({ where: { id }, data })
}

export async function deleteGoal(userId: number, id: number) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } })
  if (!goal) throw new AppError('Meta não encontrada', 404, 'GOAL_NOT_FOUND')
  await prisma.goal.delete({ where: { id } })
}
