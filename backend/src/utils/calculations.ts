/**
 * Calcula o lucro de uma aposta
 * profit = payout - amountWagered
 */
export function calculateProfit(payout: number, amountWagered: number): number {
  return parseFloat((payout - amountWagered).toFixed(2))
}

/**
 * Lucro CANÔNICO de uma aposta considerando o resultado.
 * Fonte única da verdade — use em qualquer agregação de lucro.
 *   perdeu        → -stake
 *   void/pendente → 0
 *   ganhou/cashout→ payout - stake
 * Evita contar "payout fantasma" salvo em apostas perdidas (ex.: retorno
 * potencial vindo de import/IA), que inflava o lucro em alguns relatórios.
 */
export function betProfit(result: string, payout: number, amountWagered: number): number {
  if (result === 'lost') return parseFloat((-amountWagered).toFixed(2))
  if (result === 'void' || result === 'pending') return 0
  return calculateProfit(payout, amountWagered)
}

/**
 * Calcula o retorno total a partir da odd
 * payout = amountWagered * odds
 */
export function calculatePayout(amountWagered: number, odds: number): number {
  return parseFloat((amountWagered * odds).toFixed(2))
}

/**
 * Calcula o hit rate (% de apostas ganhas)
 * Cashout conta como 0.5 — meio green/meio red
 * Ignora apostas void e pending no cálculo
 */
export function calculateHitRate(won: number, lost: number, cashout = 0): number | null {
  const total = won + lost + cashout
  if (total === 0) return null
  return parseFloat((((won + cashout * 0.5) / total) * 100).toFixed(2))
}

/**
 * Calcula o ROI (retorno sobre investimento)
 * roi = (profit / amountWagered) * 100
 */
export function calculateRoi(profit: number, amountWagered: number): number {
  if (amountWagered === 0) return 0
  return parseFloat(((profit / amountWagered) * 100).toFixed(2))
}

/**
 * Calcula a odd total de uma aposta combinada
 * totalOdds = produto de todas as odds individuais
 */
export function calculateCombinedOdds(odds: number[]): number {
  return parseFloat(odds.reduce((acc, odd) => acc * odd, 1).toFixed(4))
}

/**
 * Arredonda valor monetário para 2 casas decimais
 * Usando toFixed para evitar erros de ponto flutuante
 */
export function roundMoney(value: number): number {
  return parseFloat(value.toFixed(2))
}
