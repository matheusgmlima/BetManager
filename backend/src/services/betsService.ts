import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'
import { calculateProfit } from '../utils/calculations'
import {
  BetCreateInput as CreateBetInput,
  BetUpdateInput as UpdateBetInput,
  BetResultUpdate as ResultUpdateInput,
  BetFilters as BetFiltersInput,
  PaginatedBets,
  BetWithRelations,
} from '../types/bet.types'

const betSelect = {
  id: true,
  date: true,
  match: true,
  market: true,
  sport: { select: { id: true, name: true, icon: true } },
  bookmaker: { select: { id: true, name: true, color: true } },
  bettingProfile: { select: { id: true, name: true } },
  tipster: { select: { id: true, name: true } },
  betType: true,
  isCombined: true,
  amountWagered: true,
  odds: true,
  payout: true,
  result: true,
  notes: true,
  source: true,
  createdAt: true,
}

function formatBet(bet: any): BetWithRelations {
  const amount = Number(bet.amountWagered)
  const payout = Number(bet.payout)
  const profit = bet.result === 'lost'    ? parseFloat((-amount).toFixed(2))
               : bet.result === 'void'    ? 0
               : bet.result === 'pending' ? 0
               : calculateProfit(payout, amount)
  return {
    ...bet,
    amountWagered: amount,
    odds: bet.odds ? Number(bet.odds) : null,
    payout,
    profit,
  }
}

export async function listBets(userId: number, filters: BetFiltersInput): Promise<PaginatedBets> {
  const {
    page: _page, perPage: _perPage,
    dateFrom, dateTo, result, sportId, bookmakerId, betType, bettingProfileId, tipsterId, search,
    orderBy: _orderBy, orderDir: _orderDir,
  } = filters
  const page     = _page     ?? 1
  const perPage  = _perPage  ?? 20
  const orderBy  = _orderBy  ?? 'date'
  const orderDir = _orderDir ?? 'desc'

  const where: any = { userId }
  if (dateFrom) where.date = { ...where.date, gte: new Date(dateFrom) }
  if (dateTo) where.date = { ...where.date, lte: new Date(dateTo) }
  if (result) where.result = result
  if (sportId) where.sportId = sportId
  if (bookmakerId) where.bookmakerId = bookmakerId
  if (betType) where.betType = betType
  if (bettingProfileId) where.bettingProfileId = bettingProfileId
  if (tipsterId) where.tipsterId = tipsterId
  if (search) where.OR = [
    { market: { contains: search, mode: 'insensitive' } },
    { match:  { contains: search, mode: 'insensitive' } },
  ]

  const [total, bets] = await Promise.all([
    prisma.bet.count({ where }),
    prisma.bet.findMany({
      where,
      select: betSelect,
      orderBy: { [orderBy]: orderDir },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  const formatted = bets.map(formatBet)
  const resolved = formatted.filter((b) => b.result !== 'pending')

  const totalWagered = formatted.reduce((s, b) => s + b.amountWagered, 0)
  const totalProfit = resolved.reduce((s, b) => s + b.profit, 0)
  const won = resolved.filter((b) => b.result === 'won').length
  const lost = resolved.filter((b) => b.result === 'lost').length
  const hitRatePct = won + lost > 0 ? parseFloat(((won / (won + lost)) * 100).toFixed(2)) : null

  return {
    data: formatted,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    summary: { totalWagered, totalProfit, hitRatePct, totalBets: total },
  }
}

export async function getBetById(userId: number, id: number): Promise<BetWithRelations> {
  const bet = await prisma.bet.findFirst({ where: { id, userId }, select: betSelect })
  if (!bet) throw new AppError('Aposta não encontrada', 404, 'BET_NOT_FOUND')
  return formatBet(bet)
}

export async function createBet(userId: number, data: CreateBetInput): Promise<BetWithRelations> {
  const bet = await prisma.bet.create({
    data: {
      userId,
      date: new Date(data.date),
      match: data.match ?? null,
      market: data.market,
      sportId: data.sportId,
      bookmakerId: data.bookmakerId,
      betType: data.betType,
      isCombined: data.betType === 'combined',
      amountWagered: data.amountWagered,
      odds: data.odds,
      payout: data.payout,
      result: data.result,
      notes: data.notes,
      combinedId: data.combinedId,
      bettingProfileId: data.bettingProfileId,
      tipsterId: data.tipsterId,
    },
    select: betSelect,
  })
  return formatBet(bet)
}

export async function createBetsBatch(userId: number, bets: CreateBetInput[]): Promise<BetWithRelations[]> {
  return Promise.all(bets.map(b => createBet(userId, b)))
}

export async function updateBet(userId: number, id: number, data: UpdateBetInput): Promise<BetWithRelations> {
  await getBetById(userId, id)
  const bet = await prisma.bet.update({
    where: { id },
    data: {
      ...(data.date && { date: new Date(data.date) }),
      ...(data.match !== undefined && { match: data.match }),
      ...(data.market && { market: data.market }),
      ...(data.sportId !== undefined && { sportId: data.sportId }),
      ...(data.bookmakerId && { bookmakerId: data.bookmakerId }),
      ...(data.betType && { betType: data.betType }),
      ...(data.amountWagered && { amountWagered: data.amountWagered }),
      ...(data.odds !== undefined && { odds: data.odds }),
      ...(data.payout !== undefined && { payout: data.payout }),
      ...(data.result && { result: data.result }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.bettingProfileId !== undefined && { bettingProfileId: data.bettingProfileId }),
      ...(data.tipsterId !== undefined && { tipsterId: data.tipsterId }),
    },
    select: betSelect,
  })
  return formatBet(bet)
}

export async function updateBetResult(userId: number, id: number, data: ResultUpdateInput): Promise<BetWithRelations> {
  await getBetById(userId, id)
  const bet = await prisma.bet.update({
    where: { id },
    data: { result: data.result, payout: data.payout },
    select: betSelect,
  })
  return formatBet(bet)
}

export async function deleteBet(userId: number, id: number): Promise<void> {
  await getBetById(userId, id)
  await prisma.bet.delete({ where: { id } })
}
