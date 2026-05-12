import { useQuery, useMutation, useQueryClient } from 'react-query'
import { goalsService, GoalInput } from '../services/goalsService'

export function useGoals() {
  return useQuery(['goals'], () => goalsService.list())
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation(goalsService.create, {
    onSuccess: () => qc.invalidateQueries(['goals']),
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
