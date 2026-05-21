import { Request, Response, NextFunction } from 'express'
import * as authService from '../services/authService'
import { AppError } from '../middlewares/errorHandler'

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      throw new AppError('username, email e password sao obrigatorios', 400, 'MISSING_FIELDS')
    }
    if (password.length < 8) {
      throw new AppError('A senha deve ter pelo menos 8 caracteres', 400, 'WEAK_PASSWORD', 'password')
    }
    const result = await authService.register(username, email, password)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.query as { token?: string }
    if (!token) throw new AppError('Token obrigatorio', 400, 'MISSING_TOKEN')
    const result = await authService.verifyEmail(token)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      throw new AppError('email e password sao obrigatorios', 400, 'MISSING_FIELDS')
    }
    const result = await authService.login(email, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.getMe(req.user!.userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function updateUnit(req: Request, res: Response, next: NextFunction) {
  try {
    const { unitValue } = req.body
    if (typeof unitValue !== 'number' || unitValue <= 0) {
      throw new AppError('unitValue deve ser um numero positivo', 400, 'INVALID_UNIT_VALUE', 'unitValue')
    }
    const result = await authService.updateUnitValue(req.user!.userId, unitValue)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body
    if (!email) throw new AppError('email e obrigatorio', 400, 'MISSING_FIELDS')
    const result = await authService.resendVerification(email)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body
    if (!email) throw new AppError('email e obrigatorio', 400, 'MISSING_FIELDS')
    const result = await authService.forgotPassword(email)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      throw new AppError('token e password sao obrigatorios', 400, 'MISSING_FIELDS')
    }
    if (password.length < 8) {
      throw new AppError('A senha deve ter pelo menos 8 caracteres', 400, 'WEAK_PASSWORD', 'password')
    }
    const result = await authService.resetPassword(token, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
