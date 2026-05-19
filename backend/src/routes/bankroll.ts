import { Router } from 'express'
import { Request } from 'express'
import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'

const router = Router()

// GET /api/bankroll — entries + computed balance
router.get('/', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const entries = await prisma.bankrollEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    })
    const balance = entries.reduce((sum, e) => {
      const amt = Number(e.amount)
      return e.type === 'withdrawal' ? sum - amt : sum + amt
    }, 0)
    res.json({ data: entries.map(e => ({ ...e, amount: Number(e.amount) })), balance: parseFloat(balance.toFixed(2)) })
  } catch (err) { next(err) }
})

// POST /api/bankroll — add entry
router.post('/', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const { amount, type, note, date } = req.body
    if (!amount || !type || !['initial', 'deposit', 'withdrawal'].includes(type)) {
      throw new AppError('Dados inválidos', 400, 'INVALID_DATA')
    }
    // Only one initial allowed
    if (type === 'initial') {
      const existing = await prisma.bankrollEntry.findFirst({ where: { userId, type: 'initial' } })
      if (existing) throw new AppError('Banca inicial já definida. Use depósito/saque.', 400, 'INITIAL_EXISTS')
    }
    const entry = await prisma.bankrollEntry.create({
      data: { userId, amount: parseFloat(amount), type, note: note || null, date: date ? new Date(date) : new Date() },
    })
    res.status(201).json({ data: { ...entry, amount: Number(entry.amount) } })
  } catch (err) { next(err) }
})

// DELETE /api/bankroll/:id
router.delete('/:id', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const entry = await prisma.bankrollEntry.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!entry) throw new AppError('Entrada não encontrada', 404, 'NOT_FOUND')
    await prisma.bankrollEntry.delete({ where: { id: entry.id } })
    res.json({ message: 'Removido' })
  } catch (err) { next(err) }
})

export default router
