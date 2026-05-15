import { groq, AI_MODELS, AiModel } from '../lib/groq'
import { prisma } from '../lib/prisma'
import { parseDDMM } from '../utils/dateUtils'
import { AiExtractedBet, AiExtractionResponse } from '../types/api.types'

function buildPrompt(bookmakerNames: string[]): string {
  const casasList = bookmakerNames.length > 0
    ? bookmakerNames.join(', ')
    : 'Betano, Bet365, Superbet, Sportingbet, Betfair, KTO, Pixbet, Betsul, Mr.Jack, Novibet, Parimatch, 1xbet, Pinnacle'

  return `Você é um especialista em extrair dados de apostas esportivas de screenshots de casas de apostas brasileiras (${casasList}).

Analise a imagem cuidadosamente e extraia TODAS as apostas visíveis.
Retorne APENAS um JSON válido, sem markdown, sem \`\`\`, sem explicações.

════ REGRA FUNDAMENTAL ════
Uma aposta COMBINADA (múltipla) com várias seleções é UMA ÚNICA aposta, não várias.
Identifique pela presença de múltiplas seleções dentro do mesmo bilhete/ticket.

════ FORMATO OBRIGATÓRIO ════
{
  "apostas": [
    {
      "tipo": "simples|combinada",
      "data": "DD/MM ou null",
      "jogo": "Time A x Time B (simples) | 'Jogo1; Jogo2' (combinada) | null",
      "mercado": "seleção (simples) | 'Jogo1 {Sel1}; Jogo2 {Sel2}' (combinada)",
      "valor_apostado": 20.00,
      "casa": "nome da casa ou null",
      "odd": 2.08,
      "odds_multiplas": [1.85, 1.60],
      "retorno_total": 41.67,
      "resultado": "won|lost|void|pending"
    }
  ]
}

════ RESULTADO — PALAVRAS-CHAVE ════
"won"     → Retorno Obtido / Ganhou / Won / Cash Out
"lost"    → Perdeu / Sem Retorno / Lost
"void"    → Nula / Void / Cancelada
"pending" → Ao Vivo / Pendente / Em aberto / sem resultado visível

════ REGRAS GERAIS ════
- Use null para campos não identificáveis
- Valores monetários SEMPRE como número
- Nunca quebre uma aposta combinada em múltiplas entradas`
}

export async function extractBetsFromImage(
  userId: number,
  imageBuffer: Buffer,
  mimeType: string,
  model: AiModel = 'fast'
): Promise<AiExtractionResponse> {
  const modelId = AI_MODELS[model]
  const base64  = imageBuffer.toString('base64')

  let inputTokens  = 0
  let outputTokens = 0
  let rawResponse  = ''

  const bookmakers = await prisma.bookmaker.findMany({
    where: { active: true, OR: [{ isDefault: true }, { userId }] },
  })
  const EXTRACT_PROMPT = buildPrompt(bookmakers.map(b => b.name))

  const modelsToTry = modelId === AI_MODELS.smart
    ? [AI_MODELS.smart, AI_MODELS.fast]
    : [AI_MODELS.fast]

  let usedModel = modelId
  let lastErr   = ''

  for (const tryModel of modelsToTry) {
    try {
      const response = await groq.chat.completions.create({
        model: tryModel,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: 'text',      text: EXTRACT_PROMPT },
            ],
          },
        ],
      })
      rawResponse  = response.choices[0]?.message?.content ?? ''
      inputTokens  = response.usage?.prompt_tokens     ?? 0
      outputTokens = response.usage?.completion_tokens ?? 0
      usedModel    = tryModel
      lastErr      = ''
      break
    } catch (err: any) {
      lastErr = err?.message ?? String(err)
      const isUnavailable = lastErr.includes('404') || lastErr.includes('model_not_found') || lastErr.includes('does not exist')
      if (!isUnavailable || tryModel === modelsToTry[modelsToTry.length - 1]) {
        await logExtraction(userId, tryModel, 0, 0, 0, 0, false, lastErr)
        throw new Error(`Groq API error (model: ${tryModel}): ${lastErr}`)
      }
    }
  }

  const cleaned = rawResponse.replace(/```json|```/g, '').trim()

  let parsed: { apostas: any[] } = { apostas: [] }
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch {
    await logExtraction(userId, modelId, 0, 0, inputTokens, outputTokens, false, 'JSON inválido')
    throw new Error('IA retornou resposta em formato inválido')
  }

  const warnings: string[] = []

  const bets: AiExtractedBet[] = parsed.apostas.map((a, i) => {
    const casaRaw = (a.casa ?? '').toLowerCase().replace(/[\s.\-_]/g, '')
    const foundBookmaker = bookmakers.find((b) => {
      const bNorm = b.name.toLowerCase().replace(/[\s.\-_]/g, '')
      return bNorm === casaRaw || bNorm.includes(casaRaw) || casaRaw.includes(bNorm)
    })

    if (!foundBookmaker && a.casa) {
      warnings.push(`Aposta ${i + 1}: casa "${a.casa}" não encontrada no cadastro`)
    }

    const nullCount = [a.data, a.mercado, a.valor_apostado, a.retorno_total].filter(
      (v) => v === null || v === undefined
    ).length
    const confidence: 'high' | 'medium' | 'low' =
      nullCount === 0 ? 'high' : nullCount <= 1 ? 'medium' : 'low'

    let parsedDate = a.data
    if (a.data) {
      const raw = String(a.data).trim()
      const fullMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (fullMatch) {
        const [, d, m, y] = fullMatch
        const dt = new Date(Number(y), Number(m) - 1, Number(d))
        if (!isNaN(dt.getTime())) parsedDate = dt.toISOString().split('T')[0]
      } else if (/^\d{1,2}\/\d{1,2}$/.test(raw)) {
        const d = parseDDMM(raw)
        if (d) parsedDate = d.toISOString().split('T')[0]
      }
    }

    let odd: number | null = a.odd ?? null

    if (!odd && Array.isArray(a.odds_multiplas) && a.odds_multiplas.length > 0) {
      const product = (a.odds_multiplas as number[]).reduce((acc, o) => acc * o, 1)
      if (product > 0) odd = parseFloat(product.toFixed(4))
    }

    if (!odd && a.valor_apostado && a.retorno_total && a.valor_apostado > 0) {
      odd = parseFloat((a.retorno_total / a.valor_apostado).toFixed(4))
    }

    const betType: 'simple' | 'combined' =
      a.tipo === 'combinada' ? 'combined' : 'simple'

    return {
      date:          parsedDate ?? null,
      match:         a.jogo ?? null,
      market:        a.mercado ?? null,
      bookmaker:     a.casa ?? null,
      bookmakerId:   foundBookmaker?.id ?? null,
      amountWagered: a.valor_apostado ?? null,
      odds:          odd,
      payout:        a.retorno_total ?? null,
      result:        a.resultado ?? 'pending',
      confidence,
      betType,
    }
  })

  const log = await logExtraction(userId, usedModel, bets.length, 0, inputTokens, outputTokens, true)

  return {
    extractionId: log.id,
    modelUsed:    usedModel,
    modelFallback: usedModel !== modelId,
    betsDetected: bets.length,
    bets,
    warnings,
  }
}

export async function confirmExtraction(userId: number, extractionId: number, confirmedCount: number) {
  return prisma.aiExtractionLog.update({
    where: { id: extractionId, userId },
    data:  { betsConfirmed: confirmedCount },
  })
}

async function logExtraction(
  userId:        number,
  modelUsed:     string,
  betsDetected:  number,
  betsConfirmed: number,
  inputTokens:   number,
  outputTokens:  number,
  success:       boolean,
  errorMessage?: string
) {
  return prisma.aiExtractionLog.create({
    data: { userId, modelUsed, betsDetected, betsConfirmed, inputTokens, outputTokens, success, errorMessage },
  })
}
