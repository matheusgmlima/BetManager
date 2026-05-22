import { Request, Response, NextFunction } from 'express'
import * as adminService from '../services/adminService'
import { AppError } from '../middlewares/errorHandler'

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try { res.json(await adminService.listUsers()) } catch (err) { next(err) }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id)
    if (isNaN(userId)) throw new AppError('ID inválido', 400, 'INVALID_ID')
    res.json(await adminService.updateUser(userId, req.body))
  } catch (err) { next(err) }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, role = 'subscriber', accessExpiresAt } = req.body
    if (!email) throw new AppError('email é obrigatório', 400, 'MISSING_FIELDS')
    res.status(201).json(await adminService.createUser(email, role, accessExpiresAt))
  } catch (err) { next(err) }
}

export async function sendPasswordReset(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id)
    if (isNaN(userId)) throw new AppError('ID inválido', 400, 'INVALID_ID')
    res.json(await adminService.sendPasswordReset(userId))
  } catch (err) { next(err) }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id)
    if (isNaN(userId)) throw new AppError('ID inválido', 400, 'INVALID_ID')
    res.json(await adminService.deleteUser(userId, req.user!.userId))
  } catch (err) { next(err) }
}
