import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'
import crypto from 'crypto'

const router = Router()

// POST /api/bets/:id/share — gera ou retorna token existente (autenticado)
router.post('/bets/:id/share', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const betId = parseInt(req.params.id)
    const userId = req.user!.userId

    const bet = await prisma.bet.findFirst({ where: { id: betId, userId } })
    if (!bet) return res.status(404).json({ error: 'Aposta não encontrada' })

    let token = bet.shareToken
    if (!token) {
      token = crypto.randomBytes(24).toString('hex')
      await prisma.bet.update({ where: { id: betId }, data: { shareToken: token } })
    }

    res.json({ token, url: `/share/${token}` })
  } catch (err) { next(err) }
})

// DELETE /api/bets/:id/share — revoga o compartilhamento (autenticado)
router.delete('/bets/:id/share', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const betId = parseInt(req.params.id)
    const userId = req.user!.userId

    const bet = await prisma.bet.findFirst({ where: { id: betId, userId } })
    if (!bet) return res.status(404).json({ error: 'Aposta não encontrada' })

    await prisma.bet.update({ where: { id: betId }, data: { shareToken: null } })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// GET /api/share/:token — público, sem autenticação
router.get('/share/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bet = await prisma.bet.findUnique({
      where: { shareToken: req.params.token },
      include: { sport: true, bookmaker: true, tipster: true, bettingProfile: true },
    })

    if (!bet) return res.status(404).json({ error: 'Link inválido ou expirado' })

    // Retorna dados públicos — sem valores financeiros
    res.json({
      data: {
        id: bet.id,
        date: bet.date,
        match: bet.match,
        market: bet.market,
        betType: bet.betType,
        odds: bet.odds ? parseFloat(bet.odds.toString()) : null,
        result: bet.result,
        sport: bet.sport ? { name: bet.sport.name, icon: bet.sport.icon } : null,
        bookmaker: { name: bet.bookmaker.name, color: bet.bookmaker.color },
        tipster: bet.tipster ? { name: bet.tipster.name } : null,
        profile: bet.bettingProfile ? { name: bet.bettingProfile.name } : null,
        notes: bet.notes,
      }
    })
  } catch (err) { next(err) }
})

export default router
