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

INDICADORES DE APOSTA COMBINADA (quando presentes, SEMPRE tratar como uma única aposta):
- "ODDS TOTAIS" ou "Odd Total" com múltiplos jogos listados abaixo
- Um único valor de "APOSTA" / "PRÊMIO" para múltiplos jogos
- Jogos listados com ✓ ou ✅ seguidos de uma única linha de total/retorno
- "X mais seleções" ou "+ N mais seleções" indicando seleções adicionais
- Qualquer bilhete onde múltiplos jogos compartilham o mesmo valor apostado e retorno

════ FORMATO OBRIGATÓRIO ════
{
  "apostas": [
    {
      "tipo": "simples|combinada",
      "data": "DD/MM ou null",
      "jogo": "Time A x Time B (simples) | 'Jogo1; Jogo2; Jogo3' (combinada, só os confrontos separados por ;) | null",
      "mercado": "seleção única (simples) | 'Jogo1 {Sel1, Sel2}; Jogo2 {Sel3}' (combinada, cada jogo com suas seleções entre chaves)",
      "valor_apostado": 20.00,
      "casa": "nome da casa ou null",
      "odd": 2.08,
      "odds_multiplas": [1.85, 1.60, 1.40],
      "retorno_total": 41.67,
      "resultado": "won|lost|void|pending"
    }
  ]
}

════ IDENTIFICAÇÃO DO TIPO ════
- SIMPLES: apenas 1 jogo/seleção no ticket, com seu próprio valor apostado
- COMBINADA: 2 ou mais jogos/seleções que compartilham um único valor apostado e retorno total
  → Superbet: múltiplos jogos com "✅ Seleção @ odd" cada, seguido de "ODDS TOTAIS X.XX" = COMBINADA
  → Betano: lista com ✓ em cada seleção dentro de um bilhete = COMBINADA
  → Qualquer formato com "N mais seleções" = COMBINADA
  → Se vir "ODDS TOTAIS" com número acima de qualquer odd individual = COMBINADA

════ COMO PREENCHER CAMPOS ════
"jogo" (simples): o evento — ex: "Sport Recife x ASA"
"jogo" (combinada): APENAS os nomes dos confrontos separados por ; sem nenhuma seleção — ex: "Sada Cruzeiro - Minas TC; Toronto Raptors - Cleveland Cavaliers"
"mercado" (simples): a seleção — ex: "+2.5 gols", "Sport Recife para ganhar"
"mercado" (combinada): OBRIGATÓRIO usar o formato "Jogo {Seleção}; Jogo2 {Seleção2}". Associe cada jogo às suas seleções. NÃO use ponto-e-vírgula dentro das chaves — use vírgula para múltiplas seleções do mesmo jogo. NÃO inclua odds (@ 1.55) nas seleções.
  EXEMPLO — se a tela mostra:
    Sada Cruzeiro - Minas TC → Total de Sets - Mais de 3.5
    Toronto Raptors - Cleveland Cavaliers → Assistências 1X2 - 1
  O campo "mercado" DEVE ser:
    "Sada Cruzeiro - Minas TC {Total de Sets - Mais de 3.5}; Toronto Raptors - Cleveland Cavaliers {Assistências 1X2 - 1}"
  OUTRO EXEMPLO:
    Fluxo FC - Furia FC → Resultado Final - 2
    Dibrados FC - Loud SC → Resultado Final - 1
  O campo "mercado" DEVE ser:
    "Fluxo FC - Furia FC {Resultado Final - 2}; Dibrados FC - Loud SC {Resultado Final - 1}"
"odd": a odd TOTAL do bilhete. Prioridade: (1) valor total mostrado na tela, (2) multiplique as odds individuais (odds_multiplas), (3) calcule retorno_total / valor_apostado. Nunca deixe null se houver como calcular.
"odds_multiplas": array com cada odd individual visível na combinada (ex: [1.85, 1.60, 1.40]). null para apostas simples ou se não visíveis.
"valor_apostado": valor total apostado (número, não string)
"retorno_total": retorno total mostrado (número, não string)
"data": data no formato DD/MM/YYYY se o ano estiver visível, ou DD/MM se só dia/mês visível. Reconheça todos os formatos: "27 DE ABR. DE 2026", "27/04/2026", "27 abr 2026", "Apr 27, 2026", etc. Converta SEMPRE para DD/MM ou DD/MM/YYYY. Nunca retorne null se uma data for identificável na imagem.

════ RESULTADO — PALAVRAS-CHAVE ════
"won"     → Retorno Obtido / Ganhou / Won / Cash Out / Pag. Antecipado+Recebido / Pagamento Antecipado
"lost"    → Perdeu / Sem Retorno / Lost / Encerrada sem retorno
"void"    → Nula / Void / Cancelada / Anulada
"pending" → Ao Vivo / A decorrer / Pendente / Criar Aposta / Em aberto / sem resultado visível

════ CASAS DE APOSTAS — IDENTIFICAÇÃO ════
Casas cadastradas no sistema: ${casasList}
Retorne o nome EXATAMENTE como aparece na lista acima se reconhecer a casa.
Se a casa não estiver visível no screenshot, use null.

════ REGRAS GERAIS ════
- Use null para campos não identificáveis
- Valores monetários SEMPRE como número (não string)
- Nunca quebre uma aposta combinada em múltiplas entradas
- Se o screenshot mostrar um histórico, extraia CADA aposta individualmente`
}

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

  const bookmakers = await prisma.bookmaker.findMany({ where: { active: true } })
  const EXTRACT_PROMPT = buildPrompt(bookmakers.map(b => b.name))

  const modelsToTry = modelId === AI_MODELS.smart
    ? [AI_MODELS.smart, AI_MODELS.fast]   // Maverick → fallback Scout
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
        await logExtraction(tryModel, 0, 0, 0, 0, false, lastErr)
        throw new Error(`Groq API error (model: ${tryModel}): ${lastErr}`)
      }
      // model unavailable → try next
    }
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
      // DD/MM/YYYY
      const fullMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (fullMatch) {
        const [, d, m, y] = fullMatch
        const dt = new Date(Number(y), Number(m) - 1, Number(d))
        if (!isNaN(dt.getTime())) parsedDate = dt.toISOString().split('T')[0]
      }
      // DD/MM (no year)
      else if (/^\d{1,2}\/\d{1,2}$/.test(raw)) {
        const d = parseDDMM(raw)
        if (d) parsedDate = d.toISOString().split('T')[0]
      }
    }

    let odd: number | null = a.odd ?? null

    // fallback 1: produto das odds individuais da combinada
    if (!odd && Array.isArray(a.odds_multiplas) && a.odds_multiplas.length > 0) {
      const product = (a.odds_multiplas as number[]).reduce((acc, o) => acc * o, 1)
      if (product > 0) odd = parseFloat(product.toFixed(4))
    }

    // fallback 2: retorno / valor apostado
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

  const log = await logExtraction(usedModel, bets.length, 0, inputTokens, outputTokens, true)

  return {
    extractionId: log.id,
    modelUsed:    usedModel,
    modelFallback: usedModel !== modelId,
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
