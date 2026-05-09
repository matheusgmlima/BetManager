import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY não configurada no .env')
}

export const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export const AI_MODELS = {
  fast:  'gemini-1.5-flash',  // grátis — prints simples
  smart: 'gemini-1.5-pro',    // grátis com limite — prints complexos
} as const

export type AiModel = keyof typeof AI_MODELS
