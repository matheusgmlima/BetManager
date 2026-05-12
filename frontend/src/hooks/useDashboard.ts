import { useQuery } from 'react-query'
import { dashboardService } from '../services/dashboardService'
import { DashboardPeriod } from '../types/dashboard.types'

export function useDashboard(period: DashboardPeriod = 'month') {
  return useQuery(['dashboard', period], () => dashboardService.get(period))
}

export function useSportStats(dateFrom?: string, dateTo?: string) {
  return useQuery(['stats', 'sports', dateFrom, dateTo], () =>
    dashboardService.getSportStats(dateFrom, dateTo)
  )
}

export function useBookmakerStats(dateFrom?: string, dateTo?: string) {
  return useQuery(['stats', 'bookmakers', dateFrom, dateTo], () =>
    dashboardService.getBookmakerStats(dateFrom, dateTo)
  )
}

export function useProfileStats() {
  return useQuery(['stats', 'profiles'], () => dashboardService.getProfileStats())
}

export function useBetTypeStats() {
  return useQuery(['stats', 'bet-types'], () => dashboardService.getBetTypeStats())
}

export function useGoals() {
  return useQuery(['goals'], () => dashboardService.getGoals())
}

// profileId = undefined → all, null → no profile, number → specific profile
export function useProfileDetail(profileId: number | null | undefined, enabled: boolean) {
  return useQuery(
    ['stats', 'profile-detail', profileId],
    () => dashboardService.getProfileDetail(profileId),
    { enabled, keepPreviousData: true }
  )
}
