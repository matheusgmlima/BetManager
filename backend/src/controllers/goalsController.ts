import { Request, Response, NextFunction } from 'express'
import * as goalsService from '../services/goalsService'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await goalsService.listGoals()
    res.json({ data })
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const goal = await goalsService.createGoal(req.body)
    res.status(201).json({ data: goal })
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const goal = await goalsService.updateGoal(Number(req.params.id), req.body)
    res.json({ data: goal })
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await goalsService.deleteGoal(Number(req.params.id))
    res.json({ message: 'Meta excluída com sucesso' })
  } catch (err) { next(err) }
}
