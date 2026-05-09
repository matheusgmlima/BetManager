import { Request, Response, NextFunction } from 'express'
import * as statsService from '../services/statisticsService'

export async function bySport(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getStatsBySport(req.query as any)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function byBookmaker(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getStatsByBookmaker(req.query as any)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function byBetType(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await statsService.getStatsByBetType(req.query as any)
    res.json(result)
  } catch (err) { next(err) }
}

export async function monthly(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getMonthlyStats()
    res.json({ data })
  } catch (err) { next(err) }
}
