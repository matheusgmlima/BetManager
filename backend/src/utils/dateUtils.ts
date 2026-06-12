import { DashboardPeriod } from '../types/dashboard.types'

/**
 * Retorna o intervalo de datas para um período do dashboard
 */
export function getPeriodRange(period: DashboardPeriod): { from: Date; to: Date } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  const from = new Date(now)
  from.setHours(0, 0, 0, 0)

  switch (period) {
    case 'day':
      break
    case 'week':
      from.setDate(from.getDate() - 6)
      break
    case 'month':
      // Mês-calendário inteiro: do dia 1 até o último dia do mês,
      // incluindo apostas futuras (pendentes) ainda dentro do mês.
      from.setDate(1)
      to.setMonth(to.getMonth() + 1, 0)
      to.setHours(23, 59, 59, 999)
      break
    case 'year':
      from.setMonth(0, 1)
      to.setMonth(11, 31)
      to.setHours(23, 59, 59, 999)
      break
    case 'all':
      from.setFullYear(2000, 0, 1)
      to.setFullYear(to.getFullYear() + 100)
      break
  }

  return { from, to }
}

/**
 * Converte data DD/MM para Date (assume ano atual)
 * Usado na extração de prints pela IA
 */
export function parseDDMM(ddmm: string): Date | null {
  const match = ddmm.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1
  const year = new Date().getFullYear()

  const date = new Date(year, month, day)
  if (isNaN(date.getTime())) return null

  return date
}

/**
 * Retorna os dias restantes no mês atual
 */
export function daysRemainingInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.getDate() - now.getDate()
}

/**
 * Formata Date para string YYYY-MM-DD
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}
