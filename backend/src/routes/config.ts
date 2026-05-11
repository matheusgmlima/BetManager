import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { validate } from '../middlewares/validateRequest'
import { createBookmakerSchema, updateBookmakerSchema, createSportSchema, updateSportSchema } from '../validators/configSchema'
import { AppError } from '../middlewares/errorHandler'

const router = Router()

// Bookmakers
router.get('/bookmakers', async (_req, res, next) => {
  try {
    const data = await prisma.bookmaker.findMany({ orderBy: { name: 'asc' } })
    res.json({ data })
  } catch (err) { next(err) }
})

router.post('/bookmakers', validate(createBookmakerSchema), async (req, res, next) => {
  try {
    const data = await prisma.bookmaker.create({ data: req.body })
    res.status(201).json({ data })
  } catch (err) { next(err) }
})

router.put('/bookmakers/:id', validate(updateBookmakerSchema), async (req, res, next) => {
  try {
    const data = await prisma.bookmaker.update({ where: { id: Number(req.params.id) }, data: req.body })
    res.json({ data })
  } catch (err) { next(err) }
})

router.patch('/bookmakers/:id/toggle', async (req, res, next) => {
  try {
    const bk = await prisma.bookmaker.findUnique({ where: { id: Number(req.params.id) } })
    if (!bk) throw new AppError('Casa não encontrada', 404, 'BOOKMAKER_NOT_FOUND')
    const data = await prisma.bookmaker.update({ where: { id: bk.id }, data: { active: !bk.active } })
    res.json({ data })
  } catch (err) { next(err) }
})

// Sports
router.get('/sports', async (_req, res, next) => {
  try {
    const data = await prisma.sport.findMany({ orderBy: { name: 'asc' } })
    res.json({ data })
  } catch (err) { next(err) }
})

router.post('/sports', validate(createSportSchema), async (req, res, next) => {
  try {
    const data = await prisma.sport.create({ data: req.body })
    res.status(201).json({ data })
  } catch (err) { next(err) }
})

router.put('/sports/:id', validate(updateSportSchema), async (req, res, next) => {
  try {
    const data = await prisma.sport.update({ where: { id: Number(req.params.id) }, data: req.body })
    res.json({ data })
  } catch (err) { next(err) }
})

router.patch('/sports/:id/toggle', async (req, res, next) => {
  try {
    const sport = await prisma.sport.findUnique({ where: { id: Number(req.params.id) } })
    if (!sport) throw new AppError('Esporte não encontrado', 404, 'SPORT_NOT_FOUND')
    const data = await prisma.sport.update({ where: { id: sport.id }, data: { active: !sport.active } })
    res.json({ data })
  } catch (err) { next(err) }
})

// Betting Profiles
router.get('/profiles', async (_req, res, next) => {
  try {
    const data = await prisma.bettingProfile.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })
    res.json({ data })
  } catch (err) { next(err) }
})

export default router
