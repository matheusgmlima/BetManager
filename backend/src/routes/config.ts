import { Router } from 'express'
import { Request } from 'express'
import { prisma } from '../lib/prisma'
import { validate } from '../middlewares/validateRequest'
import { createBookmakerSchema, updateBookmakerSchema, createSportSchema, updateSportSchema, createProfileSchema, updateProfileSchema } from '../validators/configSchema'
import { AppError } from '../middlewares/errorHandler'

const router = Router()

// ─── Bookmakers ───────────────────────────────────────────────────────────────

router.get('/bookmakers', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const data = await prisma.bookmaker.findMany({
      where: { active: true, OR: [{ isDefault: true }, { userId }] },
      orderBy: { name: 'asc' },
    })
    res.json({ data })
  } catch (err) { next(err) }
})

router.post('/bookmakers', validate(createBookmakerSchema), async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const data = await prisma.bookmaker.create({ data: { ...req.body, userId, isDefault: false } })
    res.status(201).json({ data })
  } catch (err) { next(err) }
})

router.put('/bookmakers/:id', validate(updateBookmakerSchema), async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const bk = await prisma.bookmaker.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!bk) throw new AppError('Casa não encontrada', 404, 'BOOKMAKER_NOT_FOUND')
    const data = await prisma.bookmaker.update({ where: { id: bk.id }, data: req.body })
    res.json({ data })
  } catch (err) { next(err) }
})

router.patch('/bookmakers/:id/toggle', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const bk = await prisma.bookmaker.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!bk) throw new AppError('Casa não encontrada', 404, 'BOOKMAKER_NOT_FOUND')
    const data = await prisma.bookmaker.update({ where: { id: bk.id }, data: { active: !bk.active } })
    res.json({ data })
  } catch (err) { next(err) }
})

router.delete('/bookmakers/:id', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const bk = await prisma.bookmaker.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!bk) throw new AppError('Casa não encontrada', 404, 'BOOKMAKER_NOT_FOUND')
    await prisma.bookmaker.delete({ where: { id: bk.id } })
    res.json({ message: 'Casa removida' })
  } catch (err) { next(err) }
})

// ─── Sports ───────────────────────────────────────────────────────────────────

router.get('/sports', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const data = await prisma.sport.findMany({
      where: { active: true, OR: [{ isDefault: true }, { userId }] },
      orderBy: { name: 'asc' },
    })
    res.json({ data })
  } catch (err) { next(err) }
})

router.post('/sports', validate(createSportSchema), async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const data = await prisma.sport.create({ data: { ...req.body, userId, isDefault: false } })
    res.status(201).json({ data })
  } catch (err) { next(err) }
})

router.put('/sports/:id', validate(updateSportSchema), async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const sport = await prisma.sport.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!sport) throw new AppError('Esporte não encontrado', 404, 'SPORT_NOT_FOUND')
    const data = await prisma.sport.update({ where: { id: sport.id }, data: req.body })
    res.json({ data })
  } catch (err) { next(err) }
})

router.patch('/sports/:id/toggle', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const sport = await prisma.sport.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!sport) throw new AppError('Esporte não encontrado', 404, 'SPORT_NOT_FOUND')
    const data = await prisma.sport.update({ where: { id: sport.id }, data: { active: !sport.active } })
    res.json({ data })
  } catch (err) { next(err) }
})

router.delete('/sports/:id', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const sport = await prisma.sport.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!sport) throw new AppError('Esporte não encontrado', 404, 'SPORT_NOT_FOUND')
    await prisma.sport.delete({ where: { id: sport.id } })
    res.json({ message: 'Esporte removido' })
  } catch (err) { next(err) }
})

// ─── Betting Profiles ─────────────────────────────────────────────────────────

router.get('/profiles', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const data = await prisma.bettingProfile.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })
    res.json({ data })
  } catch (err) { next(err) }
})

router.post('/profiles', validate(createProfileSchema), async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const data = await prisma.bettingProfile.create({ data: { ...req.body, userId } })
    res.status(201).json({ data })
  } catch (err) { next(err) }
})

router.put('/profiles/:id', validate(updateProfileSchema), async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const profile = await prisma.bettingProfile.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!profile) throw new AppError('Perfil não encontrado', 404, 'PROFILE_NOT_FOUND')
    const data = await prisma.bettingProfile.update({ where: { id: profile.id }, data: req.body })
    res.json({ data })
  } catch (err) { next(err) }
})

router.patch('/profiles/:id/toggle', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const profile = await prisma.bettingProfile.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!profile) throw new AppError('Perfil não encontrado', 404, 'PROFILE_NOT_FOUND')
    const data = await prisma.bettingProfile.update({ where: { id: profile.id }, data: { active: !profile.active } })
    res.json({ data })
  } catch (err) { next(err) }
})

router.delete('/profiles/:id', async (req: Request, res, next) => {
  try {
    const userId = req.user!.userId
    const profile = await prisma.bettingProfile.findFirst({ where: { id: Number(req.params.id), userId } })
    if (!profile) throw new AppError('Perfil não encontrado', 404, 'PROFILE_NOT_FOUND')
    await prisma.bettingProfile.delete({ where: { id: profile.id } })
    res.json({ message: 'Perfil removido' })
  } catch (err) { next(err) }
})

export default router
