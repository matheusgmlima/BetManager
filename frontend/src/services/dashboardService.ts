import { api } from './api'
import { DashboardData, DashboardPeriod, SportStat, BookmakerStat, BetTypeStat, Goal, ProfileStat } from '../types/dashboard.types'

export const dashboardService = {
  get: (period: DashboardPeriod = 'month') =>
    api.get<{ data: DashboardData }>('/api/dashboard', { params: { period } }).then((r) => r.data.data),

  getSportStats: (dateFrom?: string, dateTo?: string) =>
    api.get<{ data: SportStat[] }>('/api/stats/sports', { params: { dateFrom, dateTo } }).then((r) => r.data.data),

  getBookmakerStats: (dateFrom?: string, dateTo?: string) =>
    api.get<{ data: BookmakerStat[] }>('/api/stats/bookmakers', { params: { dateFrom, dateTo } }).then((r) => r.data.data),

  getProfileStats: (dateFrom?: string, dateTo?: string) =>
    api.get<{ data: ProfileStat[] }>('/api/stats/profiles', { params: { dateFrom, dateTo } }).then((r) => r.data.data),

  getProfileDetail: (profileId: number | null | undefined) =>
    api.get<{ data: any }>('/api/stats/profiles/detail', {
      params: profileId === undefined ? {} : { profileId: profileId === null ? 'null' : profileId },
    }).then((r) => r.data.data),

  getBetTypeStats: () =>
    api.get<{ data: BetTypeStat[]; recommendation: string }>('/api/stats/bet-types').then((r) => r.data),

  getMonthlyStats: () =>
    api.get('/api/stats/monthly').then((r) => r.data.data),

  getGoals: () =>
    api.get<{ data: Goal[] }>('/api/goals').then((r) => r.data.data),

  createGoal: (data: { month: number; year: number; targetProfit: number; notes?: string }) =>
    api.post<{ data: Goal }>('/api/goals', data).then((r) => r.data.data),

  updateGoal: (id: number, data: Partial<{ targetProfit: number; notes: string }>) =>
    api.put<{ data: Goal }>(`/api/goals/${id}`, data).then((r) => r.data.data),

  deleteGoal: (id: number) =>
    api.delete(`/api/goals/${id}`).then((r) => r.data),
}
