import Groq from 'groq-sdk'

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY não configurada no .env')
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const AI_MODELS = {
  fast:  'meta-llama/llama-4-scout-17b-16e-instruct', // rápido e gratuito
  smart: 'meta-llama/llama-4-maverick-17b-128e-instruct', // mais preciso
} as const

export type AiModel = keyof typeof AI_MODELS
