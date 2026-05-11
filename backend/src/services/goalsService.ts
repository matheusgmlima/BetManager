import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'
import { calculateProfit } from '../utils/calculations'
import { daysRemainingInMonth } from '../utils/dateUtils'
import { CreateGoalInput, UpdateGoalInput } from '../validators/goalSchema'

export async function listGoals() {
  const goals = await prisma.goal.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] })
  const now = new Date()

  return Promise.all(
    goals.map(async (goal) => {
      const from = new Date(goal.year, goal.month - 1, 1)
      const to = new Date(goal.year, goal.month, 0, 23, 59, 59)
      const bets = await prisma.bet.findMany({
        where: { date: { gte: from, lte: to }, result: { not: 'pending' } },
      })
      const actualProfit = bets.reduce(
        (s, b) => s + calculateProfit(Number(b.payout), Number(b.amountWagered)), 0
      )
      const targetProfit = Number(goal.targetProfit)
      const progressPct = parseFloat(((actualProfit / targetProfit) * 100).toFixed(1))
      const isCurrentMonth = goal.month === now.getMonth() + 1 && goal.year === now.getFullYear()

      return {
        id: goal.id,
        month: goal.month,
        year: goal.year,
        targetProfit,
        actualProfit: parseFloat(actualProfit.toFixed(2)),
        progressPct,
        achieved: actualProfit >= targetProfit,
        isCurrentMonth,
      }
    })
  )
}

export async function createGoal(data: CreateGoalInput) {
  return prisma.goal.create({ data: { ...data, targetProfit: data.targetProfit } })
}

export async function updateGoal(id: number, data: UpdateGoalInput) {
  const goal = await prisma.goal.findUnique({ where: { id } })
  if (!goal) throw new AppError('Meta não encontrada', 404, 'GOAL_NOT_FOUND')
  return prisma.goal.update({ where: { id }, data })
}

export async function deleteGoal(id: number) {
  const goal = await prisma.goal.findUnique({ where: { id } })
  if (!goal) throw new AppError('Meta não encontrada', 404, 'GOAL_NOT_FOUND')
  await prisma.goal.delete({ where: { id } })
}
