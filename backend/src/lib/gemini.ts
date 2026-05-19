import { GoogleGenAI } from '@google/genai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY não configurada no .env')
}

export const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export const AI_MODELS = {
  fast:  'gemini-1.5-flash',   // gratuito — prints simples
  smart: 'gemini-1.5-pro',     // mais preciso — prints complexos
} as const

export type AiModel = keyof typeof AI_MODELS
