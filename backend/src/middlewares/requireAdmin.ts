import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { AppError } from './errorHandler'

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { role: true },
    })
    if (!user || user.role !== 'admin') {
      throw new AppError('Acesso negado', 403, 'FORBIDDEN')
    }
    next()
  } catch (err) {
    next(err)
  }
}
