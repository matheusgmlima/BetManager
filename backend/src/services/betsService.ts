import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'
import { calculateProfit } from '../utils/calculations'
import {
  CreateBetInput,
  UpdateBetInput,
  ResultUpdateInput,
  BetFiltersInput,
  PaginatedBets,
  BetWithRelations,
} from '../types/bet.types'

const betSelect = {
  id: true,
  date: true,
  description: true,
  sport: { select: { id: true, name: true, icon: true } },
  bookmaker: { select: { id: true, name: true, color: true } },
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
  return {
    ...bet,
    amountWagered: Number(bet.amountWagered),
    odds: bet.odds ? Number(bet.odds) : null,
    payout: Number(bet.payout),
    profit: calculateProfit(Number(bet.payout), Number(bet.amountWagered)),
  }
}

export async function listBets(filters: BetFiltersInput): Promise<PaginatedBets> {
  const { page, perPage, dateFrom, dateTo, result, sportId, bookmakerId, betType, search, orderBy, orderDir } = filters

  const where: any = {}
  if (dateFrom) where.date = { ...where.date, gte: new Date(dateFrom) }
  if (dateTo) where.date = { ...where.date, lte: new Date(dateTo) }
  if (result) where.result = result
  if (sportId) where.sportId = sportId
  if (bookmakerId) where.bookmakerId = bookmakerId
  if (betType) where.betType = betType
  if (search) where.description = { contains: search, mode: 'insensitive' }

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

export async function getBetById(id: number): Promise<BetWithRelations> {
  const bet = await prisma.bet.findUnique({ where: { id }, select: betSelect })
  if (!bet) throw new AppError('Aposta não encontrada', 404, 'BET_NOT_FOUND')
  return formatBet(bet)
}

export async function createBet(data: CreateBetInput): Promise<BetWithRelations> {
  const bet = await prisma.bet.create({
    data: {
      date: new Date(data.date),
      description: data.description,
      sportId: data.sportId,
      bookmakerId: data.bookmakerId,
      betType: data.betType,
      amountWagered: data.amountWagered,
      odds: data.odds,
      payout: data.payout,
      result: data.result,
      notes: data.notes,
      combinedId: data.combinedId,
    },
    select: betSelect,
  })
  return formatBet(bet)
}

export async function createBetsBatch(bets: CreateBetInput[]): Promise<BetWithRelations[]> {
  const created = await Promise.all(bets.map(createBet))
  return created
}

export async function updateBet(id: number, data: UpdateBetInput): Promise<BetWithRelations> {
  await getBetById(id)
  const bet = await prisma.bet.update({
    where: { id },
    data: {
      ...(data.date && { date: new Date(data.date) }),
      ...(data.description && { description: data.description }),
      ...(data.sportId !== undefined && { sportId: data.sportId }),
      ...(data.bookmakerId && { bookmakerId: data.bookmakerId }),
      ...(data.betType && { betType: data.betType }),
      ...(data.amountWagered && { amountWagered: data.amountWagered }),
      ...(data.odds !== undefined && { odds: data.odds }),
      ...(data.payout !== undefined && { payout: data.payout }),
      ...(data.result && { result: data.result }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: betSelect,
  })
  return formatBet(bet)
}

export async function updateBetResult(id: number, data: ResultUpdateInput): Promise<BetWithRelations> {
  await getBetById(id)
  const bet = await prisma.bet.update({
    where: { id },
    data: { result: data.result, payout: data.payout },
    select: betSelect,
  })
  return formatBet(bet)
}

export async function deleteBet(id: number): Promise<void> {
  await getBetById(id)
  await prisma.bet.delete({ where: { id } })
}
