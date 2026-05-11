import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY não configurada no .env')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const AI_MODELS = {
  fast: 'claude-haiku-4-5-20251001',   // prints simples — menor custo
  smart: 'claude-sonnet-4-6',           // prints complexos — maior precisão
} as const

export type AiModel = keyof typeof AI_MODELS
