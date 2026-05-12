import { api } from './api'

export interface Goal {
  id: number
  month: number
  year: number
  targetProfit: number
  actualProfit: number
  progressPct: number
  achieved: boolean
  isCurrentMonth: boolean
}

export interface GoalInput {
  month: number
  year: number
  targetProfit: number
  notes?: string | null
}

export const goalsService = {
  list: () =>
    api.get<{ data: Goal[] }>('/api/goals').then((r) => r.data.data),

  create: (data: GoalInput) =>
    api.post<{ data: Goal }>('/api/goals', data).then((r) => r.data.data),

  update: (id: number, data: Partial<GoalInput>) =>
    api.put<{ data: Goal }>(`/api/goals/${id}`, data).then((r) => r.data.data),

  remove: (id: number) =>
    api.delete(`/api/goals/${id}`).then((r) => r.data),
}
