import { api } from './api'
import { Goal, YearAnalytics, PeriodAnalytics } from '../types/dashboard.types'

export type { Goal }

export interface GoalInput {
  month: number
  year: number
  targetProfit: number
  notes?: string | null
}

export const goalsService = {
  list: () =>
    api.get<{ data: Goal[] }>('/api/goals').then((r) => r.data.data),

  getYearAnalytics: (year: number) =>
    api.get<{ data: YearAnalytics }>('/api/goals/analytics/year', { params: { year } }).then((r) => r.data.data),

  getPeriodAnalytics: (dateFrom: string, dateTo: string) =>
    api.get<{ data: PeriodAnalytics }>('/api/goals/analytics/period', { params: { dateFrom, dateTo } }).then((r) => r.data.data),

  create: (data: GoalInput) =>
    api.post<{ data: Goal }>('/api/goals', data).then((r) => r.data.data),

  update: (id: number, data: Partial<GoalInput>) =>
    api.put<{ data: Goal }>(`/api/goals/${id}`, data).then((r) => r.data.data),

  remove: (id: number) =>
    api.delete(`/api/goals/${id}`).then((r) => r.data),
}
