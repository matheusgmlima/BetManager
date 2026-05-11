import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY não configurada no .env')
}

export const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export const AI_MODELS = {
  fast:  'gemini-2.0-flash',       // grátis — prints simples
  smart: 'gemini-2.5-pro-preview-05-06', // mais preciso — prints complexos
} as const

export type AiModel = keyof typeof AI_MODELS
