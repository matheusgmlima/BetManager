import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'

const router = Router()

// Rate limit: 30 req/min por IP no endpoint público
const shareViewLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
})

// Rate limit mais restrito pro endpoint de geração (10/min por IP)
const shareGenLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de geração de links atingido.' },
})

const SHARE_TTL_DAYS = 7

// POST /api/bets/:id/share — gera/renova token (autenticado)
router.post('/bets/:id/share', shareGenLimit, authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const betId = parseInt(req.params.id as string)
    const userId = req.user!.userId

    const bet = await prisma.bet.findFirst({ where: { id: betId, userId } })
    if (!bet) return res.status(404).json({ error: 'Aposta não encontrada' })

    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SHARE_TTL_DAYS)

    await prisma.bet.update({
      where: { id: betId },
      data: { shareToken: token, shareExpiresAt: expiresAt },
    })

    res.json({ token, url: `/share/${token}`, expiresAt })
  } catch (err) { next(err) }
})

// DELETE /api/bets/:id/share — revoga (autenticado)
router.delete('/bets/:id/share', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const betId = parseInt(req.params.id as string)
    const userId = req.user!.userId

    const bet = await prisma.bet.findFirst({ where: { id: betId, userId } })
    if (!bet) return res.status(404).json({ error: 'Aposta não encontrada' })

    await prisma.bet.update({ where: { id: betId }, data: { shareToken: null, shareExpiresAt: null } })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// GET /api/share/:token — público
router.get('/share/:token', shareViewLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string
    const bet = await prisma.bet.findUnique({
      where: { shareToken: token },
      include: { sport: true, bookmaker: true, tipster: true, bettingProfile: true },
    })

    if (!bet) return res.status(404).json({ error: 'Link inválido ou expirado' })

    // Validar expiração
    if (bet.shareExpiresAt && new Date() > bet.shareExpiresAt) {
      // Limpa token expirado automaticamente
      await prisma.bet.update({ where: { id: bet.id }, data: { shareToken: null, shareExpiresAt: null } })
      return res.status(404).json({ error: 'Link expirado' })
    }

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
        expiresAt: bet.shareExpiresAt,
      }
    })
  } catch (err) { next(err) }
})

export default router
