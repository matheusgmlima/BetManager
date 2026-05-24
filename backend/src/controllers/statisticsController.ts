import { Request, Response, NextFunction } from 'express'
import * as statsService from '../services/statisticsService'

export async function bySport(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getStatsBySport(req.user!.userId, req.query as any)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function byBookmaker(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getStatsByBookmaker(req.user!.userId, req.query as any)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function byBetType(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await statsService.getStatsByBetType(req.user!.userId, req.query as any)
    res.json(result)
  } catch (err) { next(err) }
}

export async function byTipster(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getStatsByTipster(req.user!.userId, req.query as any)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function byProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getStatsByProfile(req.user!.userId, req.query as any)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function profileDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const profileId = req.query.profileId as string | undefined
    const data = await statsService.getProfileDetail(req.user!.userId, profileId)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function tipsterDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const tipsterId = req.query.tipsterId as string | undefined
    const data = await statsService.getTipsterDetail(req.user!.userId, tipsterId)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function monthly(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getMonthlyStats(req.user!.userId)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function heatmap(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getHeatmap(req.user!.userId)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function compare(req: Request, res: Response, next: NextFunction) {
  try {
    const { dateFrom1, dateTo1, dateFrom2, dateTo2 } = req.query as Record<string, string>
    const [periodA, periodB] = await Promise.all([
      statsService.getPeriodSummary(req.user!.userId, dateFrom1, dateTo1),
      statsService.getPeriodSummary(req.user!.userId, dateFrom2, dateTo2),
    ])
    res.json({ periodA, periodB })
  } catch (err) { next(err) }
}
