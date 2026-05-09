import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public errorCode?: string,
    public field?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Erro de validação Zod
  if (err instanceof ZodError) {
    const firstError = err.errors[0]
    res.status(422).json({
      detail: firstError.message,
      errorCode: 'VALIDATION_ERROR',
      field: firstError.path.join('.'),
    })
    return
  }

  // Erro de aplicação
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      detail: err.message,
      errorCode: err.errorCode,
      field: err.field,
    })
    return
  }

  // Erro do Prisma — registro não encontrado
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ detail: 'Registro não encontrado', errorCode: 'NOT_FOUND' })
      return
    }
    if (err.code === 'P2002') {
      res.status(409).json({ detail: 'Registro já existe', errorCode: 'DUPLICATE' })
      return
    }
  }

  // Erro genérico
  console.error('[ERROR]', err)
  res.status(500).json({
    detail: 'Erro interno do servidor',
    errorCode: 'INTERNAL_ERROR',
  })
}
