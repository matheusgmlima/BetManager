import { Request, Response, NextFunction } from 'express'
import * as goalsService from '../services/goalsService'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await goalsService.listGoals(req.user!.userId)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function yearAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear()
    const data = await goalsService.getYearAnalytics(req.user!.userId, year)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function periodAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { dateFrom, dateTo } = req.query as { dateFrom: string; dateTo: string }
    if (!dateFrom || !dateTo) {
      res.status(400).json({ detail: 'dateFrom e dateTo são obrigatórios' })
      return
    }
    const data = await goalsService.getPeriodAnalytics(req.user!.userId, dateFrom, dateTo)
    res.json({ data })
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const goal = await goalsService.createGoal(req.user!.userId, req.body)
    res.status(201).json({ data: goal })
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const goal = await goalsService.updateGoal(req.user!.userId, Number(req.params.id), req.body)
    res.json({ data: goal })
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await goalsService.deleteGoal(req.user!.userId, Number(req.params.id))
    res.json({ message: 'Meta excluída com sucesso' })
  } catch (err) { next(err) }
}
