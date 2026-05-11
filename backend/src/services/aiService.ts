import { genai, AI_MODELS, AiModel } from '../lib/gemini'
import { prisma } from '../lib/prisma'
import { parseDDMM } from '../utils/dateUtils'
import { AiExtractedBet, AiExtractionResponse } from '../types/api.types'

const EXTRACT_PROMPT = `Você é um especialista em extrair dados de apostas esportivas de screenshots.
Analise a imagem e extraia TODOS os registros de apostas visíveis.
Retorne APENAS um JSON válido, sem markdown, sem explicações, sem blocos de código.

Formato obrigatório:
{
  "apostas": [
    {
      "data": "DD/MM ou null",
      "descricao": "nome da aposta",
      "valor_apostado": 20.00,
      "casa": "Bet365|Superbet|...",
      "odd": 1.75,
      "retorno_total": 35.00,
      "resultado": "won|lost|void|pending"
    }
  ]
}

Regras:
- Use null para campos não identificáveis
- Valores monetários como números (não string)
- resultado: "won"=ganhou, "lost"=perdeu, "void"=nula, "pending"=sem resultado ainda
- Se a odd não aparecer, calcule: odd = retorno_total / valor_apostado`

export async function extractBetsFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  model: AiModel = 'fast'
): Promise<AiExtractionResponse> {
  const modelId = AI_MODELS[model]
  const base64 = imageBuffer.toString('base64')

  let inputTokens = 0
  let outputTokens = 0
  let rawResponse = ''

  try {
    const geminiModel = genai.getGenerativeModel({ model: modelId })

    const result = await geminiModel.generateContent([
      {
        inlineData: {
          mimeType: mimeType as 'image/png' | 'image/jpeg' | 'image/webp',
          data: base64,
        },
      },
      { text: EXTRACT_PROMPT },
    ])

    rawResponse = result.response.text()
    const usage = result.response.usageMetadata
    inputTokens = usage?.promptTokenCount ?? 0
    outputTokens = usage?.candidatesTokenCount ?? 0
  } catch (err: any) {
    await logExtraction(modelId, 0, 0, 0, 0, false, err.message)
    throw new Error(`Falha ao processar imagem com IA: ${err.message}`)
  }

  // Remove possíveis blocos de markdown que o modelo insira
  const cleaned = rawResponse.replace(/```json|```/g, '').trim()

  let parsed: { apostas: any[] } = { apostas: [] }
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch {
    await logExtraction(modelId, 0, 0, inputTokens, outputTokens, false, 'JSON inválido')
    throw new Error('IA retornou resposta em formato inválido')
  }

  const bookmakers = await prisma.bookmaker.findMany({ where: { active: true } })
  const warnings: string[] = []

  const bets: AiExtractedBet[] = parsed.apostas.map((a, i) => {
    const foundBookmaker = bookmakers.find(
      (b) => b.name.toLowerCase() === (a.casa ?? '').toLowerCase()
    )

    if (!foundBookmaker && a.casa) {
      warnings.push(`Aposta ${i + 1}: casa "${a.casa}" não encontrada no cadastro`)
    }

    const nullCount = [a.data, a.descricao, a.valor_apostado, a.retorno_total].filter(
      (v) => v === null || v === undefined
    ).length
    const confidence: 'high' | 'medium' | 'low' =
      nullCount === 0 ? 'high' : nullCount <= 1 ? 'medium' : 'low'

    let parsedDate = a.data
    if (a.data && /^\d{1,2}\/\d{1,2}$/.test(a.data)) {
      const d = parseDDMM(a.data)
      if (d) parsedDate = d.toISOString().split('T')[0]
    }

    return {
      date: parsedDate ?? null,
      description: a.descricao ?? null,
      bookmaker: a.casa ?? null,
      bookmakerId: foundBookmaker?.id ?? null,
      amountWagered: a.valor_apostado ?? null,
      odds: a.odd ?? null,
      payout: a.retorno_total ?? null,
      result: a.resultado ?? 'pending',
      confidence,
    }
  })

  const log = await logExtraction(modelId, bets.length, 0, inputTokens, outputTokens, true)

  return {
    extractionId: log.id,
    modelUsed: modelId,
    betsDetected: bets.length,
    bets,
    warnings,
  }
}

export async function confirmExtraction(extractionId: number, confirmedCount: number) {
  return prisma.aiExtractionLog.update({
    where: { id: extractionId },
    data: { betsConfirmed: confirmedCount },
  })
}

async function logExtraction(
  modelUsed: string,
  betsDetected: number,
  betsConfirmed: number,
  inputTokens: number,
  outputTokens: number,
  success: boolean,
  errorMessage?: string
) {
  return prisma.aiExtractionLog.create({
    data: { modelUsed, betsDetected, betsConfirmed, inputTokens, outputTokens, success, errorMessage },
  })
}
