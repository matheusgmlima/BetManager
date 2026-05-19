import { Request, Response } from 'express'
import * as authService from '../services/authService'

function handleError(res: Response, err: any) {
  if (err?.status) return res.status(err.status).json({ error: err.message })
  console.error(err)
  return res.status(500).json({ error: 'Erro interno' })
}

export async function register(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email e password são obrigatórios' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' })
    }
    const result = await authService.register(username, email, password)
    return res.status(201).json(result)
  } catch (err) {
    handleError(res, err)
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query as { token?: string }
    if (!token) return res.status(400).json({ error: 'Token obrigatório' })
    const result = await authService.verifyEmail(token)
    return res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email e password são obrigatórios' })
    }
    const result = await authService.login(email, password)
    return res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

export async function me(req: Request, res: Response) {
  try {
    const result = await authService.getMe(req.user!.userId)
    return res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

export async function updateUnit(req: Request, res: Response) {
  try {
    const { unitValue } = req.body
    if (typeof unitValue !== 'number' || unitValue <= 0) {
      return res.status(400).json({ error: 'unitValue deve ser um número positivo' })
    }
    const result = await authService.updateUnitValue(req.user!.userId, unitValue)
    return res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}

export async function resendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'email é obrigatório' })
    const result = await authService.resendVerification(email)
    return res.json(result)
  } catch (err) {
    handleError(res, err)
  }
}
