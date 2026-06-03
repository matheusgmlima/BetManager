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

ATENÇÃO: Um bilhete combinado pode conter múltiplos JOGOS DIFERENTES (ex: um jogo de futebol + um jogo de basquete).
Todos os jogos do mesmo bilhete formam UMA única aposta combinada.
Identifique CADA jogo e CADA seleção separadamente, mesmo que apareçam em seções visuais distintas na tela.

════ FORMATO OBRIGATÓRIO ════
{
  "apostas": [
    {
      "tipo": "simples|combinada",
      "data": "DD/MM ou null",
      "jogo": "Time A x Time B (simples) | 'Jogo1; Jogo2; Jogo3' separados por ponto-e-vírgula (combinada) | null",
      "mercado": "Seleção escolhida (simples) | 'Jogo1 {Seleção1}; Jogo2 {Seleção2}; Jogo3 {Seleção3}' (combinada — OBRIGATÓRIO incluir o nome do jogo antes de cada {} )",
      "valor_apostado": 20.00,
      "casa": "nome da casa ou null",
      "odd": 2.08,
      "odds_multiplas": [1.85, 1.60],
      "retorno_total": 41.67,
      "resultado": "won|lost|void|pending"
    }
  ]
}

════ EXEMPLO DE COMBINADA ════
Bilhete com seleções de jogos diferentes:
  - Sport Recife x Náutico → Resultado Final: Sport Recife
  - São Paulo x Santos → Mais de 2.5 Gols
  - Flamengo x Vasco → Ambos Marcam

Saída correta:
{
  "tipo": "combinada",
  "jogo": "Sport Recife x Náutico; São Paulo x Santos; Flamengo x Vasco",
  "mercado": "Sport Recife x Náutico {Resultado Final: Sport Recife}; São Paulo x Santos {Mais de 2.5 Gols}; Flamengo x Vasco {Ambos Marcam}",
  "odd": 8.45,
  "odds_multiplas": [1.85, 2.10, 2.17]
}

Bilhete com MÚLTIPLAS seleções do MESMO jogo (Sport Recife x ASA):
  - Resultado Final: Sport Recife
  - ASA - Menos de 2 Gols
  - Mais de 5 Escanteios

Saída correta — agrupe todas as seleções do mesmo jogo dentro de UM ÚNICO {}:
{
  "tipo": "combinada",
  "jogo": "Sport Recife x ASA",
  "mercado": "Sport Recife x ASA {Resultado Final: Sport Recife, ASA - Menos de 2 Gols, Mais de 5 Escanteios}",
  "odd": 5.12,
  "odds_multiplas": [1.85, 1.60, 1.73]
}

Bilhete com JOGOS DIFERENTES no mesmo bilhete combinado:
  Jogo 1 (futebol): Sport Recife x ASA
    - Resultado Final: Sport Recife
    - ASA - Menos de 2 Gols
    - Mais de 5 Escanteios
  Jogo 2 (basquete): SA Spurs x MIN Timberwolves
    - SA Spurs Para Ganhar

Saída correta — liste TODOS os jogos no "jogo" e combine seleções por jogo no "mercado":
{
  "tipo": "combinada",
  "jogo": "Sport Recife x ASA; SA Spurs x MIN Timberwolves",
  "mercado": "Sport Recife x ASA {Resultado Final: Sport Recife, ASA - Menos de 2 Gols, Mais de 5 Escanteios}; SA Spurs x MIN Timberwolves {SA Spurs Para Ganhar}",
  "odd": 2.08,
  "odds_multiplas": [1.66, 1.25]
}

════ CRIAR APOSTA / BUILD A BET (SAME GAME MULTI) ════
Bet365 e outras casas oferecem apostas chamadas "Criar Aposta", "Build a Bet" ou "Super Aumentada".
São apostas combinadas onde TODAS as seleções pertencem ao MESMO jogo único.

COMO IDENTIFICAR:
- Header do bilhete mostra "CRIAR APOSTA", "Build a Bet" ou "Super Aumentada"
- O jogo real está listado NO FINAL do bilhete, ao lado das bandeiras/escudos dos times
- Cada seleção listada é um MERCADO, NÃO um jogo (ex: "Brasil - Mais de 2 Gols" é um mercado, não um jogo)
- A odd total já aparece consolidada (ex: 3.00) — não há odds individuais por seleção visíveis

═══ REGRAS CRÍTICAS PARA CRIAR APOSTA ═══
1. O campo "jogo" DEVE conter EXATAMENTE UM jogo (sem ponto-e-vírgula). NUNCA divida em vários jogos.
2. O nome do jogo é APENAS o que aparece junto às bandeiras/escudos dos times no final do bilhete (ex: "Brasil x Panamá", "Espanha x Iraque", "Filipinas x Guame").
3. Seleções que COMEÇAM com o nome de um time (ex: "Iraque - Menos de 6.5 Chutes", "Brasil - Mais de 2 Gols", "ASA - Menos de 2 Gols", "1º Tempo: Filipinas") NÃO são jogos separados — o prefixo é apenas o time-alvo daquela estatística. Trate a linha INTEIRA como um único MERCADO dentro do jogo único da Criar Aposta.
4. Subtítulos abaixo da seleção (ex: "Time Visitante - Chutes", "Escanteios - Aposta Comparativa", "Intervalo", "Total de Gols - 3 Opções - Alternativas") são apenas categorias do mercado — NÃO os trate como seleções separadas e NÃO os inclua no "mercado". Use somente a linha principal da seleção.
5. TODAS as seleções da Criar Aposta vão dentro de UM ÚNICO par de chaves {}, separadas por vírgula.
6. LEIA TODAS as seleções do bilhete — cada ícone de check verde (✓) ou bullet circular ao lado esquerdo marca uma seleção distinta. NÃO PARE na primeira. Conte os ícones e garanta que o número de seleções dentro de {} corresponde ao número de ícones visíveis.
7. As seleções aparecem empilhadas verticalmente, cada uma com sua linha principal + um subtítulo de categoria abaixo. Percorra a lista INTEIRA de cima a baixo antes de fechar o JSON.

Exemplo 1 — bilhete "Criar Aposta" com 3 seleções em Brasil x Panamá:
  Header: CRIAR APOSTA — 3.00
  Seleções:
    - Brasil - Mais de 2 Gols
    - Para Brasil Marcar em Ambos os Tempos
    - Maior Número de Escanteios: Brasil
  Jogo (ao lado das bandeiras): Brasil x Panamá

Saída correta:
{
  "tipo": "combinada",
  "jogo": "Brasil x Panamá",
  "mercado": "Brasil x Panamá {Brasil - Mais de 2 Gols, Para Brasil Marcar em Ambos os Tempos, Maior Número de Escanteios: Brasil}",
  "odd": 3.00,
  "odds_multiplas": []
}

Exemplo 2 — bilhete "Criar Aposta" em Espanha x Iraque com seleção prefixada por time:
  Header: CRIAR APOSTA — 1.61
  Seleções:
    - Iraque - Menos de 6.5 Chutes   (subtítulo: Time Visitante - Chutes)
    - Maior Número de Escanteios: Espanha   (subtítulo: Escanteios - Aposta Comparativa)
  Jogo (ao lado das bandeiras): Espanha x Iraque

Saída correta (UM único jogo, ambas seleções dentro do mesmo {}):
{
  "tipo": "combinada",
  "jogo": "Espanha x Iraque",
  "mercado": "Espanha x Iraque {Iraque - Menos de 6.5 Chutes, Maior Número de Escanteios: Espanha}",
  "odd": 1.61,
  "odds_multiplas": []
}

ERRADO (NÃO faça isso — "Iraque" NÃO é um jogo separado só porque a seleção começa com "Iraque -"):
{
  "jogo": "Iraque; Iraque x Espanha",
  "mercado": "Iraque {Iraque - Menos de 6.5 Chutes, Time Visitante - Chutes}; Iraque x Espanha {Maior Número de Escanteios: Espanha}"
}

Exemplo 3 — bilhete "Criar Aposta" em Filipinas x Guame com 2 seleções (cuidado para NÃO esquecer a segunda):
  Header: CRIAR APOSTA — 1.41
  Seleções (DUAS — conte os ícones de check):
    ✓ 1º Tempo: Filipinas   (subtítulo: Intervalo)
    ✓ Mais de 2 Gols   (subtítulo: Total de Gols - 3 Opções - Alternativas)
  Jogo (ao lado das bandeiras): Filipinas x Guame

Saída correta (AMBAS as seleções dentro do mesmo {}):
{
  "tipo": "combinada",
  "jogo": "Filipinas x Guame",
  "mercado": "Filipinas x Guame {1º Tempo: Filipinas, Mais de 2 Gols}",
  "odd": 1.41,
  "odds_multiplas": []
}

ERRADO (NÃO faça isso — esquecer a segunda seleção "Mais de 2 Gols"):
{
  "jogo": "Filipinas x Guame",
  "mercado": "Filipinas x Guame {1º Tempo: Filipinas}"
}

════ PLAYER PROPS (PROPS DE JOGADORES) ════
Muitas casas exibem apostas em estatísticas individuais de jogadores, chamadas de Player Props.
Formato visual: "Nome do Jogador - Stat+ Quantidade" (ex: "Lebron James - 25+ Pontos")
São identificadas por terem o nome de um jogador + tipo de estatística (Pontos, Rebotes, Assistências, Roubadas, etc.)

REGRA: Props de jogadores do MESMO JOGO formam UMA ÚNICA seleção agrupada.
Cada prop individual é separada por vírgula dentro das chaves {}.

Exemplo — bilhete de player props do jogo SA Spurs x OKC Thunder:
  - Stephon Castle - 10+ Assistências
  - Victor Wembanyama - 20+ Rebotes
  - Alex Caruso - 30+ Pontos

Saída correta:
{
  "tipo": "combinada",
  "jogo": "SA Spurs x OKC Thunder",
  "mercado": "SA Spurs x OKC Thunder {Stephon Castle - 10+ Assistências, Victor Wembanyama - 20+ Rebotes, Alex Caruso - 30+ Pontos}",
  "odds_multiplas": [odd1, odd2, odd3]
}

Exemplo misto — props de jogadores + aposta em time no mesmo bilhete:
  Jogo 1: Lakers x Celtics
    - Lebron James - 30+ Pontos
    - Anthony Davis - 15+ Rebotes
  Jogo 2: Flamengo x Corinthians
    - Resultado Final: Flamengo

Saída correta:
{
  "tipo": "combinada",
  "jogo": "Lakers x Celtics; Flamengo x Corinthians",
  "mercado": "Lakers x Celtics {Lebron James - 30+ Pontos, Anthony Davis - 15+ Rebotes}; Flamengo x Corinthians {Resultado Final: Flamengo}"
}

ATENÇÃO: Leia TODAS as seleções de props — elas costumam aparecer empilhadas verticalmente.
Não pare na primeira seleção. Percorra toda a imagem de cima a baixo.

════ RESULTADO — PALAVRAS-CHAVE ════
"won"     → Retorno Obtido / Ganhou / Won
"lost"    → Perdeu / Sem Retorno / Lost
"void"    → Nula / Void / Cancelada
"cashout" → Cash Out / Cashout / Encerrado Antecipadamente / valor parcial retirado antes do fim
"pending" → Ao Vivo / Pendente / Em aberto / sem resultado visível

════ REGRAS PARA COMBINADAS ════
- "mercado" DEVE ter o formato: "Jogo {Seleção}; Jogo2 {Seleção2}" com chaves {}
- Se um jogo tem múltiplas seleções: "Jogo {Sel1, Sel2, Sel3}" — separe com vírgula dentro das chaves
- "jogo" DEVE listar TODOS os jogos únicos separados por ponto-e-vírgula (;)
- Nunca quebre uma aposta combinada em múltiplas entradas
- Varredure a imagem INTEIRA para identificar todos os jogos do bilhete, mesmo em seções diferentes
- Para player props: capture TODOS os jogadores listados, não apenas o primeiro
- Use null para campos não identificáveis
- Valores monetários SEMPRE como número`
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

    const betType: 'simple' | 'combined' =
      a.tipo === 'combinada' ? 'combined' : 'simple'

    let odd: number | null = a.odd ?? null

    if (betType === 'combined') {
      // Para combinadas a IA frequentemente coloca apenas uma leg em "odd".
      // Recalcular pelo produto das odds individuais é mais confiável.
      if (Array.isArray(a.odds_multiplas) && a.odds_multiplas.length > 1) {
        const product = (a.odds_multiplas as number[]).reduce((acc: number, o: number) => acc * o, 1)
        if (product > 1) odd = parseFloat(product.toFixed(4))
      }
      // Se ganhou e tem retorno: payout/apostado é a fonte mais precisa
      if (
        a.resultado === 'won' &&
        a.valor_apostado > 0 && a.retorno_total > a.valor_apostado
      ) {
        odd = parseFloat((a.retorno_total / a.valor_apostado).toFixed(4))
      }
    }

    // Fallbacks gerais
    if (!odd && Array.isArray(a.odds_multiplas) && a.odds_multiplas.length > 0) {
      const product = (a.odds_multiplas as number[]).reduce((acc, o) => acc * o, 1)
      if (product > 0) odd = parseFloat(product.toFixed(4))
    }

    if (!odd && a.valor_apostado && a.retorno_total && a.valor_apostado > 0) {
      odd = parseFloat((a.retorno_total / a.valor_apostado).toFixed(4))
    }

    // Para combinadas: garante formato "Jogo {Seleção1, Seleção2}; Jogo2 {Seleção3}"
    let market: string | null = a.mercado ?? null
    let match:  string | null = a.jogo    ?? null

    if (betType === 'combined') {
      // Normaliza match: troca "+" por ";"
      if (match && !match.includes(';') && match.includes('+')) {
        match = match.split('+').map((s: string) => s.trim()).join('; ')
      }

      if (market && !market.includes('{')) {
        // IA não usou {}: reconstrói cruzando jogo[] com mercado[]
        const games = match ? match.split(';').map((s: string) => s.trim()).filter(Boolean) : []
        const sels  = market.split(';').map((s: string) => s.trim()).filter(Boolean)
        if (games.length > 0 && sels.length > 0) {
          market = games.map((g: string, idx: number) => {
            const sel = sels[idx] ?? ''
            return sel ? `${g} {${sel}}` : g
          }).join('; ')
          match = games.join('; ')
        } else if (sels.length > 0) {
          market = sels.map((s: string, idx: number) => `Seleção ${idx + 1} {${s}}`).join('; ')
        }
      }

      if (market && market.includes('{')) {
        // Agrupa seleções do mesmo jogo: "Jogo {Sel1}; Jogo {Sel2}" → "Jogo {Sel1, Sel2}"
        const gameMap = new Map<string, string[]>()
        const gameOrder: string[] = []
        const blocks = market.split(';').map((s: string) => s.trim()).filter(Boolean)
        for (const block of blocks) {
          const braceStart = block.indexOf('{')
          const braceEnd   = block.lastIndexOf('}')
          if (braceStart === -1 || braceEnd === -1) {
            if (!gameMap.has(block)) { gameMap.set(block, []); gameOrder.push(block) }
            continue
          }
          const game = block.slice(0, braceStart).trim()
          const sel  = block.slice(braceStart + 1, braceEnd).trim()
          if (!gameMap.has(game)) { gameMap.set(game, []); gameOrder.push(game) }
          if (sel) gameMap.get(game)!.push(sel)
        }
        market = gameOrder.map(g => {
          const sels = gameMap.get(g) ?? []
          return sels.length > 0 ? `${g} {${sels.join(', ')}}` : g
        }).join('; ')
        // Atualiza match com jogos únicos
        match = gameOrder.join('; ')
      }
    }

    return {
      date:          parsedDate ?? null,
      match,
      market,
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
