import { Request, Response, NextFunction } from 'express'
import * as aiService from '../services/aiService'
import { AiModel } from '../lib/groq'

export async function extract(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(422).json({ detail: 'Nenhuma imagem enviada', errorCode: 'NO_FILE' })
      return
    }
    const model: AiModel = req.body.model === 'sonnet' ? 'smart' : 'fast'
    const result = await aiService.extractBetsFromImage(req.user!.userId, req.file.buffer, req.file.mimetype, model)
    res.json(result)
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    if (msg.includes('Groq API error')) {
      res.status(502).json({ detail: msg, errorCode: 'AI_ERROR' })
      return
    }
    next(err)
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const { extractionId, confirmedCount } = req.body
    await aiService.confirmExtraction(req.user!.userId, extractionId, confirmedCount)
    res.json({ message: 'Extração confirmada' })
  } catch (err) { next(err) }
}
