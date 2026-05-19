import { useQuery, useMutation, useQueryClient } from 'react-query'
import { goalsService, GoalInput } from '../services/goalsService'

export function useGoals() {
  return useQuery(['goals'], () => goalsService.list())
}

export function useYearAnalytics(year: number) {
  return useQuery(['goals', 'analytics', 'year', year], () => goalsService.getYearAnalytics(year), {
    keepPreviousData: true,
  })
}

export function usePeriodAnalytics(dateFrom: string | null, dateTo: string | null) {
  return useQuery(
    ['goals', 'analytics', 'period', dateFrom, dateTo],
    () => goalsService.getPeriodAnalytics(dateFrom!, dateTo!),
    { enabled: !!dateFrom && !!dateTo, keepPreviousData: true }
  )
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation(goalsService.create, {
    onSuccess: () => {
      qc.invalidateQueries(['goals'])
    },
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation(
    ({ id, data }: { id: number; data: Partial<GoalInput> }) =>
      goalsService.update(id, data),
    { onSuccess: () => qc.invalidateQueries(['goals']) },
  )
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation(goalsService.remove, {
    onSuccess: () => qc.invalidateQueries(['goals']),
  })
}
