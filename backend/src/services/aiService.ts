import { groq, AI_MODELS, AiModel } from '../lib/groq'
import { prisma } from '../lib/prisma'
import { parseDDMM } from '../utils/dateUtils'
import { AiExtractedBet, AiExtractionResponse } from '../types/api.types'

const EXTRACT_PROMPT = `Você é um especialista em extrair dados de apostas esportivas de screenshots de casas de apostas brasileiras (Betano, Bet365, Superbet, Sportingbet, Betfair, KTO, Pixbet, etc.).

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
      "jogo": "Time A x Time B (simples) | 'Time1; Time2; Time3' (combinada, todos os jogos separados por ;) | null",
      "mercado": "seleção única (simples) | 'Seleção1; Seleção2; Seleção3' (combinada, todas as seleções separadas por ;)",
      "valor_apostado": 20.00,
      "casa": "nome da casa ou null",
      "odd": 2.08,
      "retorno_total": 41.67,
      "resultado": "won|lost|void|pending"
    }
  ]
}

════ IDENTIFICAÇÃO DO TIPO ════
- SIMPLES: apenas 1 seleção no ticket (ex: "Flamengo para ganhar", "+2.5 gols")
- COMBINADA: 2 ou mais seleções agrupadas num mesmo bilhete (ex: Betano mostra lista com ✓ em cada seleção)

════ COMO PREENCHER CAMPOS ════
"jogo" (simples): o evento — ex: "Sport Recife x ASA"
"jogo" (combinada): todos os confrontos separados por ; — ex: "Sport Recife x ASA; MIN Timberwolves x SA Spurs"
"mercado" (simples): a seleção — ex: "+2.5 gols", "Sport Recife para ganhar"
"mercado" (combinada): TODAS as seleções separadas por ; — ex: "Resultado Final: Sport Recife; ASA - Menos de 2 Gols; Mais de 5 Escanteios; SA Spurs Para Ganhar"
"odd": a odd TOTAL do bilhete. Se não mostrada, calcule: odd = retorno_total / valor_apostado
"valor_apostado": valor total apostado (número, não string)
"retorno_total": retorno total mostrado (número, não string)
"data": data no formato DD/MM se visível, senão null

════ RESULTADO — PALAVRAS-CHAVE ════
"won"     → Retorno Obtido / Ganhou / Won / Cash Out / Pag. Antecipado+Recebido / Pagamento Antecipado
"lost"    → Perdeu / Sem Retorno / Lost / Encerrada sem retorno
"void"    → Nula / Void / Cancelada / Anulada
"pending" → Ao Vivo / A decorrer / Pendente / Criar Aposta / Em aberto / sem resultado visível

════ CASAS DE APOSTAS — IDENTIFICAÇÃO ════
Betano, Bet365, Superbet, Sportingbet, Betfair, KTO, Pixbet, Betsul, Mr.Jack, Novibet, Parimatch, 1xbet, Pinnacle
Se a casa não estiver visível no screenshot, use null.

════ REGRAS GERAIS ════
- Use null para campos não identificáveis
- Valores monetários SEMPRE como número (não string)
- Nunca quebre uma aposta combinada em múltiplas entradas
- Se o screenshot mostrar um histórico, extraia CADA aposta individualmente`

export async function extractBetsFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  model: AiModel = 'fast'
): Promise<AiExtractionResponse> {
  const modelId = AI_MODELS[model]
  const base64  = imageBuffer.toString('base64')

  let inputTokens  = 0
  let outputTokens = 0
  let rawResponse  = ''

  try {
    const response = await groq.chat.completions.create({
      model: modelId,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: 'text',
              text: EXTRACT_PROMPT,
            },
          ],
        },
      ],
    })

    rawResponse  = response.choices[0]?.message?.content ?? ''
    inputTokens  = response.usage?.prompt_tokens     ?? 0
    outputTokens = response.usage?.completion_tokens ?? 0
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    await logExtraction(modelId, 0, 0, 0, 0, false, msg)
    throw new Error(`Groq API error (model: ${modelId}): ${msg}`)
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

    const nullCount = [a.data, a.mercado, a.valor_apostado, a.retorno_total].filter(
      (v) => v === null || v === undefined
    ).length
    const confidence: 'high' | 'medium' | 'low' =
      nullCount === 0 ? 'high' : nullCount <= 1 ? 'medium' : 'low'

    let parsedDate = a.data
    if (a.data && /^\d{1,2}\/\d{1,2}$/.test(a.data)) {
      const d = parseDDMM(a.data)
      if (d) parsedDate = d.toISOString().split('T')[0]
    }

    let odd = a.odd ?? null
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

  const log = await logExtraction(modelId, bets.length, 0, inputTokens, outputTokens, true)

  return {
    extractionId: log.id,
    modelUsed:    modelId,
    betsDetected: bets.length,
    bets,
    warnings,
  }
}

export async function confirmExtraction(extractionId: number, confirmedCount: number) {
  return prisma.aiExtractionLog.update({
    where: { id: extractionId },
    data:  { betsConfirmed: confirmedCount },
  })
}

async function logExtraction(
  modelUsed:     string,
  betsDetected:  number,
  betsConfirmed: number,
  inputTokens:   number,
  outputTokens:  number,
  success:       boolean,
  errorMessage?: string
) {
  return prisma.aiExtractionLog.create({
    data: { modelUsed, betsDetected, betsConfirmed, inputTokens, outputTokens, success, errorMessage },
  })
}
