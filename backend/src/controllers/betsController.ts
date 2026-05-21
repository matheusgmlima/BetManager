import { Request, Response, NextFunction } from 'express'
import * as betsService from '../services/betsService'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await betsService.listBets(req.user!.userId, req.query as any)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await betsService.getBetById(req.user!.userId, Number(req.params.id))
    res.json({ data: bet })
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await betsService.createBet(req.user!.userId, req.body)
    res.status(201).json({ data: bet })
  } catch (err) { next(err) }
}

export async function createBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const bets = await betsService.createBetsBatch(req.user!.userId, req.body.bets)
    res.status(201).json({ created: bets.length, bets })
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await betsService.updateBet(req.user!.userId, Number(req.params.id), req.body)
    res.json({ data: bet })
  } catch (err) { next(err) }
}

export async function updateResult(req: Request, res: Response, next: NextFunction) {
  try {
    const bet = await betsService.updateBetResult(req.user!.userId, Number(req.params.id), req.body)
    res.json({ data: bet })
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await betsService.deleteBet(req.user!.userId, Number(req.params.id))
    res.json({ message: 'Aposta excluída com sucesso', id: Number(req.params.id) })
  } catch (err) { next(err) }
}
